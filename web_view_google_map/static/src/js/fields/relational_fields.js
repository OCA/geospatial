odoo.define('web_view_google_map.relational_fields', function (require) {
    'use strict';

    var core = require('web.core');
    var relational_fields = require('web.relational_fields');
    var MapRenderer = require('web_view_google_map.MapRenderer');

    var qweb = core.qweb;

    relational_fields.FieldOne2Many.include({
        _render: function () {
            if (!this.view || this.renderer) {
                return this._super();
            }
            var arch = this.view.arch;
            var viewType;
            if (arch.tag == 'map') {
                viewType = 'map';
                var record_options = {
                    editable: true,
                    deletable: true,
                    read_only_mode: this.isReadonly,
                };
                this.renderer = new MapRenderer(this, this.value, {
                    arch: arch,
                    record_options: record_options,
                    viewType: viewType,
                    fieldLat: arch.attrs.lat,
                    fieldLng: arch.attrs.lng,
                    markerColor: arch.attrs.color,
                    mapLibrary: arch.attrs.library,
                    drawingMode: arch.attrs.drawing_mode,
                    drawingPath: arch.attrs.drawing_path,
                });
                this.$el.addClass('o_field_x2many o_field_x2many_' + viewType);
                return this.renderer.appendTo(this.$el);
            }
            return this._super();
        },

        /**
         * Override
         */
        _renderButtons: function () {
            this._super.apply(this, arguments);
            if (this.view.arch.tag === 'map') {
                var options = {create_text: this.nodeOptions.create_text, widget: this};
                this.$buttons = $(qweb.render('MapView.buttons', options));
                this.$buttons.on('click', 'button.o-map-button-new', this._onAddRecord.bind(this));
                this.$buttons.on('click', 'button.o-map-button-center-map', this._onMapCenter.bind(this));
            }
        },
        _onMapCenter: function (event) {
            event.stopPropagation();
            if (this.renderer.mapLibrary === 'geometry') {
                this.renderer.mapGeometryCentered();
            } else if (this.renderer.mapLibrary === 'drawing') {
                this.renderer.mapShapesCentered();
            }
        },
    });

});
