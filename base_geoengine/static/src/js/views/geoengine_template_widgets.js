/*---------------------------------------------------------
 * Odoo base_geoengine
 * Author Benjamin Willig 2017 Acsone SA/NV
 *---------------------------------------------------------
*/

odoo.define('base_geoengine.template_widgets', function (require) {
    "use strict";

    var formats = require('web.formats');
    var pyeval = require('web.pyeval');
    var Registry = require('web.Registry');
    var Widget = require('web.Widget');

    /**
     * Interface to be implemented by geonengine fields.
     *
     */
    var FieldInterface = {
        /**
            Constructor.
            - parent: The widget's parent.
            - field: A dictionary giving details about the field, including the current field's value in the
                raw_value field.
            - $node: The field <field> tag as it appears in the view, encapsulated in a jQuery object.
        */
        init: function(parent, field, $node) {},
    };

    /**
     * Abstract class for classes implementing FieldInterface.
     *
     * Properties:
     *     - value: useful property to hold the value of the field. By default, the constructor
     *     sets value property.
     *
     */
    var AbstractField = Widget.extend(FieldInterface, {
        /**
            Constructor that saves the field and $node parameters and sets the "value" property.
        */
        init: function(parent, field, $node) {
            this._super(parent, field, $node);
            this.field = field;
            this.$node = $node;
            this.options = pyeval.py_eval(this.$node.attr("options") || '{}');
            this.format_descriptor = _.extend({}, this.field, {'widget': this.$node.attr('widget')});
            this.set("value", field.raw_value);
        },
        renderElement: function() {
            this.$el.text(formats.format_value(this.field.raw_value, this.format_descriptor));
        }
    });

    var FieldChar = AbstractField.extend({
        tagName: 'span',
    });

    var FieldMany2one = AbstractField.extend({
        tagName: 'span',
    });

    var FieldFloat = AbstractField.extend({
        tagName: 'span',
    });

    var FieldFloatTime = AbstractField.extend({
        tagName: 'span',
    });

    var FieldDate = AbstractField.extend({
        tagName: 'span',
    });

    var FieldDatetime = AbstractField.extend({
        tagName: 'span',
    });

    var fields_registry = new Registry();
    fields_registry
        .add('char', FieldChar)
        .add('many2one', FieldMany2one)
        .add('float', FieldFloat)
        .add('float_time', FieldFloat)
        .add('date', FieldDate)
        .add('datetime', FieldDatetime)
    ;

    return {
        AbstractField: AbstractField,
        registry: fields_registry,
    };

});
