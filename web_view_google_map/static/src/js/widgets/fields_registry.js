odoo.define('web_view_google_map.FieldsRegistry', function (require) {
    'use strict';

    var registry = require('web.field_registry');
    var GplacesAutocomplete = require('web_view_google_map.GplaceAutocompleteFields');

    registry.add('gplaces_address_autocomplete', GplacesAutocomplete.GplacesAddressAutocompleteField);
    registry.add('gplaces_autocomplete', GplacesAutocomplete.GplacesAutocompleteField);

});
