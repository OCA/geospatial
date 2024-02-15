odoo.define("website_snippet_OpenStreetMap.snippet_options", function (require) {
    "use strict";

    const options = require("web_editor.snippets.options");

    //const publicWidget = require("web.public.widget");

    console.log(options)


    options.registry.OpenStreetMap = options.Class.extend({

        onBuilt() {
            console.log("onBuilt")
            this._super.apply(this, arguments);
            console.log(this.$target[0].id)
            this.$target[0].id = this.generateUniqueId();
            console.log(this.$target[0].dataset)
            //TODO FIND A WAY TO INITIALIZE THE MAP
            //var map = new OpenLayerMap(this.$target[0].id);
        },

        init: function () {
            this._super.apply(this, arguments);

        },

        async selectDataAttribute(previewMode, widgetValue, params) {
            await this._super(...arguments);
            console.log("Options modified: "+params.attributeName)
            console.log(params)
            if (['mapAddress', 'mapType', 'mapZoom'].includes(params.attributeName)) {
                console.log("Change in map options")
            }
        },
        generateUniqueId: function () {
            return 'snippet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        },
        saveSnippet: function (previewMode, widgetValue, params) {
            console.log("save")
            return this._super(...arguments);
        }

    });
});
