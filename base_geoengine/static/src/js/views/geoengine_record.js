odoo.define('base_geoengine.Record', function (require) {
    "use strict";

    var core = require('web.core');
    var data = require('web.data');
    var formats = require('web.formats');
    var framework = require('web.framework');
    var session = require('web.session');
    var time = require('web.time');
    var utils = require('web.utils');
    var Widget = require('web.Widget');

    var fields_registry = require('base_geoengine.template_widgets').registry;

    var GeoengineRecord = Widget.extend({
        template: 'Geoengine.Record',

        init: function (parent, record, options) {
            var self = this;
            self._super(parent);
            self.fields = options.fields;
            self.qweb = options.qweb;
            self.record = record;
            self.id = record.id;
            self.sub_widgets = [];
            self.init_content();
        },

        init_content: function() {
            var self = this;
            self.record = self.transform_record(self.record);
            self.render_content();
        },

        transform_record: function(record) {
            var self = this;
            var new_record = {};
            _.each(_.extend(_.object(_.keys(this.fields), []), record), function(value, name) {
                var r = _.clone(self.fields[name] || {});
                r.raw_value = value;
                r.value = formats.format_value(value, r);
                new_record[name] = r;
            });
            return new_record;
        },

        render_content: function() {
            var self = this;
            var qweb_context = {
                record: self.record,
                widget: self,
                user_context: session.user_context,
                formats: formats,
            };
            self.content = self.qweb.render('layer-box', qweb_context);
        },

        start: function() {
            var self = this;
            self.add_widgets();
        },

        add_widgets: function() {
            var self = this;
            self.$("field").each(function() {
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