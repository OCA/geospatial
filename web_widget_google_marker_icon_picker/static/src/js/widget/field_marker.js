odoo.define('web_widget_google_marker_icon_picker.MarkerColor', function (require) {
    'use strict';

    var core = require('web.core');
    var AbstractField = require('web.AbstractField');
    var registry = require('web.field_registry');
    var qweb = core.qweb;

    var MarkerColorPicker = AbstractField.extend({
        tag_template: 'FieldMarkerColorPicker',
        className: 'o_field_char_marker_color',
        supportedFieldTypes: ['char'],
        events: _.extend({}, AbstractField.prototype.events, {
            'click .dropdown-toggle': '_onOpenMarkerPicker'
        }),

        _onOpenMarkerPicker: function (ev) {
            ev.preventDefault();
            this.$marker_picker = $(qweb.render('FieldMarkerColorPicker.marker_picker', {
                'widget': this,
            }));
            $(ev.currentTarget).after(this.$marker_picker);
            this.$marker_picker.dropdown();
            this.$marker_picker.one('click', 'a', this._onSelectMarker.bind(this));
        },

        _renderEdit: function () {
            this._renderMarker();
        },

        _renderReadonly: function () {
            this._renderMarker();
        },

        _renderMarker: function () {
            this.$el.html(qweb.render(this.tag_template, { color: this.value }));
        },

        _onSelectMarker: function (ev) {
            ev.preventDefault();
            var color = $(ev.currentTarget).attr('data-color');
            var self = this;
            this.trigger_up('field_changed', {
                dataPointID: self.dataPointID,
                changes: {
                    [self.name]: color
                },
            });
        }
    });

    registry.add('google_marker_picker', MarkerColorPicker);

});
