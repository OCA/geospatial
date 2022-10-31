/* eslint-disable */
odoo.define("web_view_google_map.relational_fields", function (require) {
    "use strict";

    const core = require("web.core");
    const relational_fields = require("web.relational_fields");
    const GoogleMapRenderer = require("web_view_google_map.GoogleMapRenderer")
        .GoogleMapRenderer;

    const qweb = core.qweb;

    relational_fields.FieldOne2Many.include({
        init: function () {
            this._super.apply(this, arguments);
            if (this.view && this.view.arch.tag === "google_map") {
                this.mapMode = this.view.arch.mode ? this.view.arch.mode : "geometry";
            }
        },
        _render: function () {
            if (!this.view || this.renderer) {
                return this._super();
            }
            const arch = this.view.arch;
            if (arch.tag == "google_map") {
                const func_name = "_render_map_" + this.mapMode;
                this.renderer = this[func_name].call(this, arch);
                this.$el.addClass("o_field_x2many o_field_x2many_google_map");
                return this.renderer.appendTo(this.$el);
            }
            return this._super();
        },
        _render_map_geometry: function (arch) {
            // TODO: this must be taken from record/model permission
            const record_options = {
                editable: true,
                deletable: true,
                read_only_mode: this.isReadonly,
            };
            return new GoogleMapRenderer(this, this.value, {
                arch: arch,
                record_options: record_options,
                viewType: "google_map",
                fieldLat: arch.attrs.lat,
                fieldLng: arch.attrs.lng,
                markerColor: arch.attrs.color,
                mapMode: this.mapMode,
            });
        },
        /**
         * Override
         */
        _renderButtons: function () {
            this._super.apply(this, arguments);
            if (this.view.arch.tag === "google_map") {
                const func_name = "_render_map_button_" + this.mapMode;
                this[func_name].call(this);
            }
        },
        _render_map_button_geometry: function () {
            const options = {create_text: this.nodeOptions.create_text, widget: this};
            this.$buttons = $(qweb.render("GoogleMapView.buttons", options));
            this.$buttons.on(
                "click",
                "button.o-map-button-new",
                this._onAddRecord.bind(this)
            );
            this.$buttons.on(
                "click",
                "button.o-map-button-center-map",
                this._onMapCenter.bind(this)
            );
        },
        _onMapCenter: function (event) {
            event.stopPropagation();
            const func_name = "_map_center_" + this.renderer.mapMode;
            this.renderer[func_name].call(this.renderer, true);
        },
        is_action_enabled: function (action) {
            return this.activeActions[action];
        },
    });
});
