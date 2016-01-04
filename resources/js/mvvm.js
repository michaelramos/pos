(function(global){

	var partialModels = [];
	
    global.MVVM = {
		
		partial : function(id) {
			var res = $.grep(partialModels, function(p){ return p.id === id; });
			return res.length > 0 ? $(res[0].element).clone() : undefined;
		},
		
		uuid: function() {
			var text = "";
			var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

			for( var i=0; i < 5; i++ )
				text += possible.charAt(Math.floor(Math.random() * possible.length));

			return text;
		},
		
		load : function(elem) {
			if(!elem) {
				$('[partial-view]').each(function() {
					partialModels.push({
						id: $(this).attr('partial-view'),
						element: $(this).detach()
					});
				});
			}else{				
				elem.find('[partial-view]').each(function(){
					var e = $(this);
					if($.grep(partialModels, function(o){ return o.id === $(this).attr('partial-view');}).length == 0) {
						partialModels.push({
							id: e.attr('partial-view'),
							element: e.detach()
						});
					}
				});
			}
		}
	};
	
	
	$('document').ready(function() {
		MVVM.load();
	});
	
})(window);