odoo.define("base_geoengine.Record", function (require) {
    "use strict";

    var field_utils = require("web.field_utils");
    var session = require("web.session");
    var Widget = require("web.Widget");

    var fields_registry = require("base_geoengine.template_widgets").registry;

    var GeoengineRecord = Widget.extend({
        template: "Geoengine.Record",

        init: function (parent, record, options) {
            this._super(parent);
            this.fields = options.fields;
            this.qweb = options.qweb;
            this.record = record;
            this.id = record.id;
            this.sub_widgets = [];
            this._initContent();
        },

        _initContent: function () {
            this.record = this._transformRecord(this.record);
            this._renderContent();
        },

        _transformRecord: function (record) {
            var new_record = {};
            _.each(
                _.extend(_.object(_.keys(this.fields), []), record),
                function (value, name) {
                    var r = _.clone(this.fields[name] || {});
                    r.raw_value = value;
                    var formatted_value = field_utils.format[r.type](value, r);
                    r.value = formatted_value;
                    new_record[name] = r;
                }.bind(this)
            );
            return new_record;
        },

        _renderContent: function () {
            var qweb_context = {
                record: this.record,
                widget: this,
                user_context: session.user_context,
                // Formats: formats,
            };
            this.content = this.qweb.render("layer-box", qweb_context);
        },

        start: function () {
            this._addWidgets();
        },

        _addWidgets: function () {
            var self = this;
            self.$("field").each(function () {
                var $field = $(this);
                var field = self.record[$field.attr("name")];
                var type = $field.attr("widget") || field.type;
                var FieldWidget = fields_registry.get(type);
                if (FieldWidget !== undefined) {
                    var widget = new FieldWidget(self, field, $field);
                    widget.replace($field);
                    self.sub_widgets.push(widget);
                }
            });
        },
    });

    return GeoengineRecord;
});
