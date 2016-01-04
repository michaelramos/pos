(function(global){
/*
	Platform.register('home', {
		init: function(e) {
			$('.transaction-menus').html();
			
			$.each(Platform.templates(), function(i, p) {
				if(p.name !== 'home') {
					var module = MVVM.partial('transaction-menu');
					module.find('.transaction-name').html(p.text);
					module.find('.transaction-description').html(p.description);
					module.find('.demo-card-square > .mdl-card__title').css('background-color', p.color);
					module.find('a.action').click(function(){ Platform.load(p.name); });
					$('.transaction-menus').append(module);
				}
			});
		}
	});
	*/
})(window);