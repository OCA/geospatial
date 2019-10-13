/* ---------------------------------------------------------
 * Odoo base_geoengine
 * Author Luis Felipe Mileo - KMEE INFORMATICA LTDA
 * License in __manifest__.py at root level of the module
 * ---------------------------------------------------------
 */
odoo.define('base_geoengine.GeoEngineButton', function (require) {
    "use strict";

    var BasicController = require('web.BasicController');

    function setPosition(position){
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        console.log(latitude);
        console.log(longitude);
    }

    function errorCallback(){
       console.log("Waiting time exceeded, try again");
    }

    BasicController.include({
        _callButtonAction: function () {
            if(arguments[0].widget === "geo_button"){
                   if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            setPosition,
                            errorCallback,
                            {timeout:5000}
                        );
                   } else {
                       console.log("Geolocation not supported by this browser");
                  }
            }
            this._super.apply(this, arguments);
        },
    });
});
