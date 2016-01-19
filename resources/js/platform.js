(function(global){
	var modules = [];
	var presenters = [];
	var handlers = [];
	var navigator = { addContextMenu: undefined };
	
	var main = $('body');
	
	global.Platform = {
		updateUI : function(){
			componentHandler.upgradeAllRegistered();
		},
		
		modules: modules,
		presenter: function(name, callback) {
			presenters.push({
				name: name,
				presenter: callback
			});
		},
		
		resource: function(path) {
			var deferred = $.Deferred();
			$.get(path).done(function(data) {
				var module = { properties: {} };
				
				$(data).each(function(){
					$.each(this.attributes, function() {
						if(this.specified) module.properties[this.name] = this.value;
					});
				});
				
				module.content = $($(data).find('content').html());
				module.menus = [];
				
				$(data).find('menu').each(function() {
					var menu = {};
					$.each(this.attributes, function() {
						if(this.specified) menu[this.name] = this.value;
					});
					if(!menu.title) menu.title = $(this).text();
					module.menus.push(menu);
				});
				
				MVVM.load(module.content);
				
				$(data).find('link').each(function(){ $('head').append($(this)); });
				$(data).find('script').each(function() { $('body').append($(this)); });
				
				modules.push(module);
				deferred.resolve(module);
			});
			
			var promise = deferred.promise();
			handlers.push(promise);
			
			return Platform;
		},
		
		initialize: function(handler) {
			$.when.apply($, handlers).then(function(args) {
				main = handler(navigator);
				Platform.load();
			});
			return Platform;
		},
		
		load : function(name, args) {
			if(name) {
				$.each(modules, function(){
					var module = this;
					if(module.properties.name === name)  {
						main.html(module.content);
						var p = $.grep(presenters, function(o){ return o.name === module.properties.presenter;  });
						p = p.length == 0 ? undefined : p[0].presenter;
						if(p && p.init) {
							navigator.searchable(!module.properties.nosearch);
							navigator.addContextMenu(module.menus);
							navigator.setTitle(module.properties.title);
							p.init(navigator, args);
							componentHandler.upgradeAllRegistered();
						}
						return false;
					}
				});
				return;
			}
			main.html(navigator.default());
		}
	}
})(window);