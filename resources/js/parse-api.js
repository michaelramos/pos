(function(global){
    //helper
    var INSERT = 1;
    var UPDATE = 2;
    var AppUtil = (function(){
        var self  = {};
        var settings  = { applicationId:'', clientKey:'', javascriptKey:'', windowsKey:'', restApiKey:'', masterKey:'', activePlatform:undefined};
        self.model    = {
            ITEM      : {cloud: 'Item', instance: undefined, local:'pos_item', pk: 'item_id'}, //instance is set when _Entity's cloudInstance() is created
            ITEM_PRICE: {cloud: 'ItemPrice', instance: undefined, local:'pos_item_price', pk: 'item_price_id'}
        };
        self.getModel = function(_className){
            switch(_className){
                case self.model.ITEM.cloud : 
                case self.model.ITEM.local : return self.model.ITEM;
                case self.model.ITEM_PRICE.cloud : 
                case self.model.ITEM_PRICE.cloud : return self.model.ITEM_PRICE;
                default:  return undefined;
            }
        };
        self.platform =  {
            WEB : 'Web',
            REST: 'Rest'
        };
        self.isBlank  = function(_str){
            return typeof _str === 'string' && _str.trim().length < 1;
        };
        self.isNull   = function(_obj){
            return typeof _obj === 'undefined' || _obj === null;
        };
        self.validateEntity   = function(_data){
            if(!(_data instanceof _Entity)){
                throw 'Unsupported cloud data.';
            }
        };
        self.validatePlatform = function(_platform){
            if(!(_platform instanceof _Platform)){
                throw 'Unsupported cloud platform.';
            }
        };
        self.registerPlatform = function(_platform){
            var key   = _platform.getKeyName();
            var value = _platform.getKeyValue();
            settings[key] = value;
        };
        self.activatePlatform = function (_applicationId, _platform){
            Parse.initialize(_applicationId, _platform.getKeyValue());
            settings.applicationId   = _applicationId;
            settings.activePlatform  = _platform;
        };
        self.getActivePlatform = function(){
            return settings.activePlatform;
        };
        self.isRegistered = function(_platform){
            return !AppUtil.isNull(settings.activePlatform)
                && _platform.getName()   === settings.activePlatform.getName()
                && _platform.getKeyValue === settings.activePlatform.getKeyValue();
        };
        self.isParseObject = function(_obj){
            return _obj instanceof Parse.Object;
        };
        self.toJson =  function(_obj){
            if(AppUtil.isNull(_obj)){
                return {};
            }
            if(AppUtil.isParseObject(_obj)){
                return _obj.attributes;
            }
            
            throw 'Unsupported object';
        };
        return self;
    })();
    //factories
    var EntityFactory   = (function () {
        var instance = {};
        function create(_appData){
            if(AppUtil.isNull(AppUtil.getModel(_appData.cloud))){
                throw 'Unsupported cloud data class: ' + _appData.cloud;
            }
            instance[_appData.cloud] = new _Entity(_appData);;
            return instance[_appData.cloud];
        };

        return {
            get: function (_className) {
                if (!instance[_className]) {
                        instance[_className] = create(_className);
                }
                return instance[_className];
            }
        };
    })();
    var PlatformFactory = (function () {
        var instance = {};
        function create(_name){
            switch(_name){
                case AppUtil.platform.WEB :
                    instance[_name] = new _Platform(AppUtil.platform.WEB, 'javascriptKey');
                    break;
                case AppUtil.platform.REST :
                    instance[_name] = new _Platform(AppUtil.platform.REST, 'restApiKey');
                    break;
                default: throw 'Unsupported cloud data platform: ' + _name;
            }
            return instance[_name];
        };

        return {
            get: function (_name) {
                if (!instance[_name]) {
                        instance[_name] = create(_name);
                }
                return instance[_name];
            }
        };
    })();
    //dao
    var CloudDAO = (function(){
        var self = {};
        self.put = function(_parseObject, _data){
            return AppUtil.isNull(_data)
                    ?  _parseObject.save()
                    : _parseObject.save(_data);
        };
        self.get = function(_parseObject, _pk, _data){
            var deferred = $.Deferred();
            var query = new Parse.Query(_parseObject);
            query.equalTo(_pk, _data[_pk]);
            query.first({
                success: function (_response) { deferred.resolve(_response); 
                },error: function (e) { deferred.reject(e);
                }
            });
            return deferred.promise();
        };
        self.list = function(_parseObject, _data){
            var deferred = $.Deferred();
            try{
                var query = new Parse.Query(_parseObject);
                //add constraints
                Object.keys(_data).forEach(function (_field) {
                    var val = _data[_field];
                    if (!AppUtil.isNull(val) && !AppUtil.isBlank(val)) {
                        query.equalTo(_field, val);
                    }
                });
                //run query
                query.first({
                    success: function(_response){ deferred.resolve(_response);
                    },error: function(e){ deferred.reject(e);
                    }
                });
            }catch(e){
                deferred.reject(e);
            }
            return deferred.promise();
        };
        self.delete = function(_parseObject){
            return _parseObject.destroy();
        };
        return self;
    })();

    //App
    global.CloudApp = (function () {
        var self = {};
        //supported cloud objects
        self.Entity     = {
            ITEM      : EntityFactory.get(AppUtil.model.ITEM),
            ITEM_PRICE: EntityFactory.get(AppUtil.model.ITEM_PRICE)
        };
        self.Platform   = {
            WEB  : PlatformFactory.get(AppUtil.platform.WEB),
            REST : PlatformFactory.get(AppUtil.platform.REST)
        };
        //cloud app functionalities
        self.init = function(_platform, _applicationId, _key){
            var deferred = $.Deferred();
            try{
                AppUtil.validatePlatform(_platform);
                if(!AppUtil.isRegistered(_platform)){
                    _platform.setupKey(_key);
                    AppUtil.registerPlatform(_platform);
                    AppUtil.activatePlatform(_applicationId, _platform);
                }
                deferred.resolve(true);
            }catch(e){
                deferred.reject('Failed to initialize cloud database. ' + e);
            }
            return deferred.promise();
        };
        self.put = function(_entity, _data){
            var deferred = $.Deferred();
            try{
                AppUtil.validateEntity(_entity);
                var cloudObj = _entity.cloudInstance();
                var pk       = _entity.getLocalPK();
                var saveType = INSERT;
                //get existing, then save
                $.when(CloudDAO.get(cloudObj, pk, _data))
                 .then(function(_existing){
                     if(!AppUtil.isNull(_existing)){
                         saveType = UPDATE;
                         cloudObj = _existing;
                     }
                    CloudDAO.put(cloudObj, _data);
                 })
                 .then(function(){
                     deferred.resolve(saveType);
                 })
                 .fail(function(e){
                     deferred.reject(e);
                 });
            }catch(e){
                deferred.reject(e);
            }
            return deferred.promise();
        };
        self.get = function(_entity, _data){
            return CloudDAO.get(_entity.cloudInstance(), _data);
        };
        self.list = function(_entity, _data){
            var deferred = $.Deferred();
            try{
                AppUtil.validateEntity(_entity);
                var cloudObj = _entity.cloudInstance();
                $.when(CloudDAO.list(cloudObj, _data))
                .then(function(_response){
                    deferred.resolve(_response);
                })
                .fail(function(e){
                    deferred.reject(e);
                });
            }catch(e){
                deferred.reject('Failed to retrieve cloud data. ' + e);
            }
            return deferred.promise();
        };
        self.delete = function(_entity, _data){
            var deferred = $.Deferred();
            try{
                AppUtil.validateEntity(_entity);
                var cloudObj = _entity.cloudInstance();
                var pk       = _entity.getLocalPK();
                $.when(CloudDAO.get(cloudObj, pk, _data))
                .then(function(_existing){
                    if(AppUtil.isNull(_existing)){
                        deferred.resolve(false);
                    }else{
                        $.when(CloudDAO.delete(cloudObj))
                        .then(function (_deletedObj) {
                            deferred.resolve(true);
                        })
                        .fail(function (_objToBeDeleted, _error) {
                            deferred.reject(_error);
                        });
                    }
                })
                .fail(function(e){
                    deferred.reject(e);
                });
            }catch(e){
                deferred.reject('Failed to delete cloud data. ' + e);
            }
            return deferred.promise();
        };
        self.isOnline = function(){
            return navigator.onLine;
	};
        return self;
    })();

    //inner classes
    function _Platform(_name, _keyName){
        var name = _name;
        var keyValue  = '';
        var keyName   = _keyName;
        this.getName  = function(){
            return name;
        };
        this.getKeyValue = function(){
            return keyValue;
        };
        this.getKeyName = function(){
            return keyName;
        };
        this.setupKey = function(_key){
            keyValue = _key;
        };
        this.equals = function(_other){
             if(!(_other instanceof _Platform)){
                return false;
            }
            return getName() === _other.getName();
        };
    };
    function _Entity(_appData){
        var className  = _appData.cloud;
        var localTable = _appData.local;
        var localPK     = _appData.pk;
        //getters
        this.getClassName = function(){
            return className;
        };

        this.getLocalTable = function(){
                return localTable;
        };
        this.getLocalPK = function(){
            return localPK;
        };
        this.cloudInstance = function(){
            return createObjIfNotExists(className);
        };
        this.equals = function(_other){
            if(!(_other instanceof _Entity)){
                    return false;
            }
            return getClassName() === _other.getClassName();
        };

        function createObjIfNotExists(_className){
            var appData = AppUtil.getModel(_className);
            if(AppUtil.isNull(appData)){
                throw 'Unsuported cloud data class: ' + _className;
            }
            var hasInstance = !AppUtil.isNull(appData.instance);
            if(!hasInstance){
                var CloudObject = Parse.Object.extend(_className); //register subclass
                switch(_className){
                    case AppUtil.model.ITEM.cloud :
                        AppUtil.model.ITEM.instance = new CloudObject();
                        return AppUtil.model.ITEM.instance;
                    case AppUtil.model.ITEM.cloud:
                        AppUtil.model.ITEM_PRICE.instance = new CloudObject();
                        return AppUtil.model.ITEM.instance;
                }
            }
            return appData;
        };
    };
})(window);
