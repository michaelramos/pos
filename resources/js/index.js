$(function() {
	window.POSDB = new ConnectionManager($.ajax({
		url: 'schema/pos.json',
		dataType: 'json'
	}));
	
	var o = POSDB.transaction(function(repo) {
		var item_dao = repo.lookup('pos_item');
		var item_price_dao = repo.lookup('pos_item_price');
		var order_dao = repo.lookup('pos_order');
		var order_item_dao = repo.lookup('pos_order_item');
		var sale_dao = repo.lookup('pos_sale');
		var payment_dao = repo.lookup('pos_payment');
		var sale_adjustment_dao = repo.lookup('pos_sale_adjustment');
		
		var dao = [ item_dao, item_price_dao, order_dao, order_item_dao, sale_dao, payment_dao, sale_adjustment_dao ];
		$.each(dao, function() {
			this.single().results(function(rows) { console.log(rows); });
		})
	}).fail(function(err) {
		console.log('error in loading db')
		console.log(err);
	});
	
	//register new plugin
	Platform.resource('modules/item.html')
			.resource('modules/item-view.html')
		    .resource('modules/order.html')
			.resource('modules/invoice.html')
			.resource('modules/adjustment.html')
	
	//initilize platform
	Platform.initialize(function(navigator) {
		
		navigator.searchable = function (res) {
			if(!res)
				$('#platform-search').hide();
			else	
				$('#platform-search').show();
		};
		
		navigator.addContextMenu = function(menus){
			$('#platform-context-menu').html('');
			$.each(menus, function(){
				var menu = this;
				var contextMenu = MVVM.partial('platfom-context-menu-item');
				contextMenu.text(menu.title);
				contextMenu.addClass('platform-context-menu');
				contextMenu.attr('menu-action', menu.action)
				$('#platform-context-menu').append(contextMenu);
			});
		};
		
		navigator.default = function() {
			var platformMain = MVVM.partial('platform-default');
			$.each(Platform.modules, function(){
				var module = this;
				if(!module.properties.partial){
					var platformMenu = MVVM.partial('platform-transaction-menu')
					platformMenu.find('.platform-transaction-name').text(module.properties.title);
					platformMenu.find('.platform-transaction-description').text(module.properties.description);
					platformMenu.find('.demo-card-square > .mdl-card__title').css('background-color', module.properties.color);
					platformMain.append(platformMenu);
					platformMenu.find('a.action').click(function() {
						Platform.load(module.properties.name);
					});
				}
			});
			
			return platformMain;
		},
		
		navigator.addContextMenu([
			{title: "Settings"},
			{title: "Sync"},  
			{title: "Help"}
		]);
		
		navigator.setTitle = function(title) {
			$('#platform-title').text(title);
		};
		
		return $('main > div.page-content');
	});
	
});