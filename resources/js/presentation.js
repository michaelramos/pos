$(function(){

	Controller.transactions().done(function(transactions) {
		$.each(transactions, function(i, m) {
			var menu = MVVM.partial('transaction-menu');
			console.log(m.name);
			menu.find('.transaction-name').text(m.name);
			menu.find('.transaction-description').text(m.description);
			menu.find('.demo-card-square > .mdl-card__title').css('background-color', m.color);
			
			menu.find('a.action').click(function() {
				$('.transaction-menus').hide('fast');
				$('#' + m.id).show('fast');
			});
			
			$('.transaction-menus').append(menu);
		});
	});
	
	
	
});