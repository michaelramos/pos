$(function() {
    $.when(CloudApp.init(CloudApp.Platform.WEB, '241oVLWNn5lJdC4kpSr5zlmlbEvtNNz6dLHkc0cX', 'KlBMJ73v8so1U8QIhIqbKqI2XmV8VJAoCoxRDRSs'))
     .then(function () {
        console.log('Cloud DB ready.');
     })
     .then(function(){
         var posItem = {"item_id": 3, "code": "C3", "name": "Burger Meal", "description": "1PC Burger + Reg. Fries + Drinks", "price": 87, "status": "READY", "item_price_id": 3,
                        "unit_of_measure": "PIECES", "created_by": "Jody"};
         return CloudApp.put(CloudApp.Entity.ITEM, posItem);
     })
     .then(function(_response){
        console.log(_response);
     })
     .fail(function(e){
        console.log(e);
      });
});