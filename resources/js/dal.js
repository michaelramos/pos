var util = function() {
	
	if(!window.Number.prototype.currency) {
		
		window.Number.prototype.currency = function(cur) {
			var res = this.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
			return (cur) ? (cur + ' ' + res) : res;
		}
	}
	
    var self = this;
    this.each = function(list, handler) {
        for (var i = 0; i < list.length; i++) {
            handler(list[i], i);
        };
    };

    this.grep = function(list, handler) {
        var selected = [];
        self.each(list, function(o, i) {
            if (handler(o, i))
                selected.push(o);
        });
        return selected;
    };

    this.where = function(col) {
        var criteria = new Criteria();
        if (col !== undefined)
            criteria.addColumn(col);
        return criteria;
    };

    this.limit = function(limit, offset) {
        var e = self.where().empty();
        if (limit !== undefined)
            e.limit(limit);
        if (offset !== undefined)
            e.offset(offset);
        return e;
    };

    this.async = function(func) {
        setTimeout(func, 0);
    };
    
    this.timestamp = function() {
        var temp = new Date();
        return self.padStr(temp.getFullYear()) +
                  self.padStr(1 + temp.getMonth()) +
                  self.padStr(temp.getDate()) +
                  self.padStr(temp.getHours()) +
                  self.padStr(temp.getMinutes()) +
                  self.padStr(temp.getSeconds());
    };
    
    this.padStr = function(i) {
        return (i < 10) ? "0" + i : "" + i;
    };
    
    this.parameter = function(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };
    
    this.isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    
    return self;
}();

function Condition(criteria) {
    var self = this;
    var criteria = criteria;
    var offset;
    var limit;

    this.offset = function(val) {
        if (val !== undefined) {
            offset = val;
            return self;
        }
        return offset;
    };

    this.limit = function(val) {
        if (val !== undefined) {
            limit = val;
            return self;
        }
        return limit;
    };

    this.and = function(col) {
        criteria.addColumn('AND');
        if (col !== undefined) {
            criteria.addColumn(col);
        }
        return criteria;
    };

    this.or = function(col) {
        criteria.addColumn('OR');
        if (col !== undefined) {
            criteria.addColumn(col);
        }
        return criteria;
    };

    this.clause = function(criteria) {
        criteria.addColumn('(');
        criteria.addCriteria(criteria);
        criteria.addColumn(')');
        return self;
    };

    this.parse = function() {
        if (limit !== undefined) {
            criteria.addColumn('LIMIT ' + limit);
            if (offset !== undefined)
                criteria.addColumn(', ' + offset);
        }
        return criteria.parse();
    };
}
;

function Criteria() {
    var self = this;
    var sql = [];
    var args = [];
    var condition = new Condition(self);

    this.addColumn = function(col) {
        sql.push(col);
    };

    this.limit = function(val) {
        return condition.limit(val);
    };

    this.offset = function(val) {
        return condition.offset(val);
    };

    this.addCriteria = function(criteria) {
        var p = criteria.parse();
        sql.push(p.sql);
        util.each(p.args, function(a) {
            args.push(a);
        });
    };

    this.equal = function(val) {
        if (val !== undefined) {
            sql.push('= ?');
            args.push(val);
        } else {
            sql.push('=');
        }
        return condition;
    };

    this.greaterThan = function(val) {
        if (val !== undefined) {
            sql.push('> ?');
            args.push(val);
        } else {
            sql.push('>');
        }
        return condition;
    };

    this.lessThan = function(val) {
        if (val !== undefined) {
            sql.push('< ?');
            args.push(val);
        } else {
            sql.push('<');
        }
        return condition;
    };

    this.greaterThanOrEqual = function(val) {
        if (val !== undefined) {
            sql.push('>= ?');
            args.push(val);
        } else {
            sql.push('>=');
        }
        return condition;
    };

    this.lessThanOrEqual = function(val) {
        if (val !== undefined) {
            sql.push('<= ?');
            args.push(val);
        } else {
            sql.push('<=');
        }
        return condition;
    };

    this.like = function(val) {
        sql.push('LIKE ?');
        args.push(val);
        return condition;
    };

    this.clause = function(criteria) {
        sql.push('(');
        self.addCriteria(criteria);
        sql.push(')');
        return self;
    };

    this.empty = function() {
        return condition;
    };

    this.parse = function() {
        return {
            sql: sql.join(' '),
            args: args
        };
    };
}
;

function EntityDAO(_repo, _tx, _table, _onError) {
    var self = this;
    var repo = _repo;
    var tx = _tx;
	var onError = _onError;
    
    this.table = _table;
    this.init = function() {
        var sql = [];
        sql.push('CREATE TABLE IF NOT EXISTS ');
        sql.push(self.table.name);
        sql.push('(');
        util.each(self.table.columns, function(col, i) {
            if (i !== 0)
                sql.push(',');

            sql.push(col.name);
            sql.push(col.type ? col.type : 'TEXT');
            sql.push(col.id ? 'PRIMARY KEY' : '');
            sql.push(col.unique ? 'unique' : '');
            sql.push(col.auto ? 'AUTOINCREMENT' : '');
        });
        sql.push(');');
        tx.executeSql(sql.join(' '), []);
        return self;
    };

    this.list = function(criteria) {
        var sql = [];
        var args = [];

        sql.push('SELECT * FROM');
        sql.push(self.table.name);

        if (criteria !== undefined) {
            var c = criteria.parse();
            sql.push('WHERE');
            sql.push(c.sql);
            args = c.args;
        }
        sql.push(';');
        return {
            results: function(func) {
				var deferred = $.Deferred();
                tx.executeSql(sql.join(' '), args, function(tx, results) {
                    try {
                        func(results.rows, repo);
						deferred.resolve(self);
                        return true;
                    } catch(e){
                        deferred.reject(e);
                        return false;
                    }
                }, onError(deferred.reject));
                return deferred.promise();
            }
        };
    };

    this.single = function(criteria) {
        var c = criteria !== undefined ? criteria.limit(1) : util.limit(1);
        return self.list(c);
    };

    this.delete = function(data) {
		var deferred = $.Deferred();
        var sql = [];
        var ids = [];
        sql.push('DELETE FROM');
        sql.push(self.table.name);
        sql.push('WHERE');

        util.each(self.table.columns, function(col) {
            var p = data[col.name];
            if (p !== undefined && col.id === true) {
                if (ids.length > 0)
                    sql.push('AND');
                sql.push(col.name + '=?');
                ids.push(p);
            }
        });
        sql.push(';');
		tx.executeSql(sql.join(' '), params, deferred.resolve, onError(deferred.reject));
		return deferred.promise();
    };

    this.insert = function(data) {
		var deferred = $.Deferred();
        var sql = [];
        var values = [];
        var params = [];
        sql.push('INSERT INTO');
        sql.push(self.table.name);
        sql.push('(');

        util.each(self.table.columns, function(col) {
            var p = data[col.name];
            if (p !== undefined) {
                if (params.length !== 0) {
                    sql.push(',');
                    values.push(',');
                }

                sql.push(col.name);
                values.push('?');
                params.push(p);
            }
        });
        sql.push(')');
        sql.push('VALUES(' + values.join(' ') + ');');
		tx.executeSql(sql.join(' '), params, function(){
			tx.executeSql('SELECT last_insert_rowid()', [], function(tx, results) {
				deferred.resolve(tx, results.rows.item(0)['last_insert_rowid()']);
			}, onError(deferred.reject));
		}, onError(deferred.reject));    
		return deferred.promise();
    };

    this.update = function(data) {
		var deferred = $.Deferred();
        var sql = [];
        var ids = [];
        var params = [];
        sql.push('UPDATE');
        sql.push(self.table.name);
        sql.push('SET');
        util.each(self.table.columns, function(col) {
            var p = data[col.name];
            if (p !== undefined && col.id !== true) {
                if (params.length !== 0)
                    sql.push(',');
                sql.push(col.name + '=?');
                params.push(p);
            }

            if (p !== undefined && col.id === true)
                ids.push({name: col.name, val: p});
        });

        if (ids.length !== 0) {
            sql.push('WHERE');
            util.each(ids, function(u, i) {
                if (i !== 0)
                    sql.push('AND');
                sql.push(u.name + '=?');
                params.push(u.val);
            });
        }
		tx.executeSql(sql.join(' '), params, deferred.resolve, onError(deferred.reject));
		return deferred.promise();
    };
}
;

function Repository(tx, db, onError) {
    var self = this;
    var db = db;
    var tx = tx;
    var cache = [];
	var onError = onError;

    this.lookup = function(entity, func) {
        var dao = util.grep(cache, function(o) {
            return o.table.name === entity;
        });
        if (dao.length === 0) {
            var tables = util.grep(db.tables, function(o) {
                return o.name === entity;
            });
            if (tables.length === 0)
                return undefined;
            dao = new EntityDAO(self, tx, tables[0], onError);
            var promise = dao.init();
            if(func !== undefined) func(promise);
            cache.push(dao);
            return dao;
        }
        return dao[0];
    };
}
;

function Database(config, shell) {
    var self = this;
    this.name = config.name;
    this.displayName = config.displayName;
    this.version = config.version;
    this.size = config.size;
    this.tables = config.tables;
    this.shell = shell;

    this.transaction = function(txMethod) {
		var deferred = $.Deferred();
		self.shell.transaction(function(tx) {
			try{
				txMethod(new Repository(tx, self, function(callback){
					return function(err) {
						callback(err);
						return false;
					};
				}));
				return true;
			}catch(e){
				deferred.reject(e);
				return false;
			}
		}, deferred.reject, deferred.resolve);
		return deferred.promise();
    };
}
;

var DataContext = function() {
    var self = this;
    var dataList = [];

    this.connect = function(config) {
        var res = util.grep(dataList, function(o) {
            return o.name === config.name;
        });
        if (res.length > 0)
            return res[0];

        var shell = window.openDatabase(config.name, config.version, config.displayName, config.size);
        var con = new Database(config, shell);

        dataList.push(con);
        return con;
    };

    return self;
}();

var ConnectionManager = function(promise) {
	var configPromise = promise;
    this.transaction = function(func) {
		
        var self = this;
        if (self.connection)
            return self.connection.transaction(func);
        else {
			var deferred = $.Deferred();
			configPromise.done(function(config){
				self.connection = DataContext.connect(config);
                self.connection.transaction(func).done(deferred.resolve).fail(deferred.reject);
			}).fail(deferred.reject);
			return deferred.promise();
        }
    }
};