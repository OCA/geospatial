odoo.define('web_view_google_map.GplaceAutocompleteFields', function (require) {
    'use strict';

    var BasicFields = require('web.basic_fields');
    var core = require('web.core');
    var Utils = require('web_view_google_map.Utils');
    var _t = core._t;

    var GplaceAutocomplete = BasicFields.InputField.extend({
        tagName: 'span',
        supportedFieldTypes: ['char'],
        events: _.extend({}, BasicFields.InputField.prototype.events, {
            'focus': '_geolocate',
        }),
        /**
         * @override
         */
        init: function () {
            this._super.apply(this, arguments);
            this.places_autocomplete = false;
            this.component_form = Utils.GOOGLE_PLACES_COMPONENT_FORM;
            this.address_form = Utils.ADDRESS_FORM;
            this.fillfields_delimiter = {
                street: " ",
                street2: ", ",
            };
            this.fillfields = {};
            this.lng = false;
            this.lat = false;
            this.setDefault();
        },
        /**
         * @override
         */
        start: function () {
            return this._super.apply(this, arguments).then(this.prepareWidgetOptions.bind(this));
        },
        /**
         * Set widget default value
         */
        setDefault: function () { },
        /**
         * get fields type
         */
        getFillFieldsType: function () {
            return [];
        },
        /**
         * Prepare widget options
         */
        prepareWidgetOptions: function () {
            if (this.mode === 'edit') {
                // update 'fillfields', 'component_form', 'delimiter' if exists
                if (this.attrs.options) {
                    if (this.attrs.options.hasOwnProperty('component_form')) {
                        this.component_form = _.defaults({}, this.attrs.options.component_form, this.component_form);
                    }
                    if (this.attrs.options.hasOwnProperty('delimiter')) {
                        this.fillfields_delimiter = _.defaults({}, this.attrs.options.delimiter, this.fillfields_delimiter);
                    }
                    if (this.attrs.options.hasOwnProperty('lat')) {
                        this.lat = this.attrs.options.lat;
                    }
                    if (this.attrs.options.hasOwnProperty('lng')) {
                        this.lng = this.attrs.options.lng;
                    }
                    if (this.attrs.options.hasOwnProperty('address_form')) {
                        this.address_form = _.defaults({}, this.attrs.options.address_form, this.address_form);
                    }
                }

                this.target_fields = this.getFillFieldsType();
                this.initGplacesAutocomplete()
            }
        },
        /**
         * Geolocate
         * @private
         */
        _geolocate: function () {
            var self = this;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    var geolocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    var circle = new google.maps.Circle({
                        center: geolocation,
                        radius: position.coords.accuracy
                    });

                    self.places_autocomplete.setBounds(circle.getBounds());
                });
            }
        },
        /**
         * @private
         */
        _prepareValue: function (model, field_name, value) {
            var model = model || false;
            var field_name = field_name || false;
            var value = value || false;
            return Utils.fetchValues(model, field_name, value);
        },
        /**
         * @private
         */
        _populateAddress: function (place, fillfields, delimiter) {
            var place = place || false;
            var fillfields = fillfields || this.fillfields;
            var delimiter = delimiter || this.fillfields_delimiter;
            return Utils.gmaps_populate_address(place, fillfields, delimiter);
        },
        /**
         * Map google address into Odoo fields
         * @param {*} place 
         * @param {*} fillfields 
         */
        _populatePlaces: function (place, fillfields) {
            var place = place || false;
            var fillfields = fillfields || this.fillfields;
            return Utils.gmaps_populate_places(place, fillfields);
        },
        /**
         * Get country's state
         * @param {*} model 
         * @param {*} country 
         * @param {*} state 
         */
        _getCountryState: function (model, country, state) {
            var model = model || false;
            var country = country || false;
            var state = state || false;
            return Utils.fetchCountryState(model, country, state);
        },
        /**
         * Set country's state
         * @param {*} model 
         * @param {*} country 
         * @param {*} state 
         */
        setCountryState: function (model, country, state) {
            var self = this;
            if (model && country && state) {
                this._getCountryState(model, country, state).then(function (result) {
                    var state = {
                        [self.address_form.state_id]: result,
                    }
                    self._onUpdateWidgetFields(state);
                });
            }
        },
        /**
         * @private
         */
        _setGeolocation: function (latitude, longitude) {
            var res = {};
            if (_.intersection(_.keys(this.record.fields), [this.lat, this.lng]).length === 2) {
                res[this.lat] = latitude;
                res[this.lng] = longitude;
            }
            return res;
        },
        /**
         * @private
         */
        _onUpdateWidgetFields: function (values) {
            var values = values || {};
            this.trigger_up('field_changed', {
                dataPointID: this.dataPointID,
                changes: values,
                viewType: this.viewType,
            });
        },
        /**
         * Initialize google autocomplete
         */
        initGplacesAutocomplete: function () { },
        /**
         * @override
         */
        destroy: function () {
            if (this.places_autocomplete) {
                this.places_autocomplete.unbindAll();
            }
            // Remove all PAC container in DOM if any
            $('.pac-container').remove();
            return this._super();
        }

    });

    var GplaceAddressAutocompleteField = GplaceAutocomplete.extend({
        className: 'o_field_char o_field_google_address_autocomplete',
        /**
         * @override
         */
        setDefault: function () {
            this._super.apply(this, arguments);
            this.fillfields = {
                [this.address_form.street]: ['street_number', 'route'],
                [this.address_form.street2]: ['administrative_area_level_3', 'administrative_area_level_4', 'administrative_area_level_5'],
                [this.address_form.city]: ['locality', 'administrative_area_level_2'],
                [this.address_form.zip]: 'postal_code',
                [this.address_form.state_id]: 'administrative_area_level_1',
                [this.address_form.country_id]: 'country'
            };
        },
        /**
         * @override
         */
        prepareWidgetOptions: function () {
            if (this.mode === 'edit' && this.attrs.options) {
                if (this.attrs.options.hasOwnProperty('fillfields')) {
                    this.fillfields = _.defaults({}, this.attrs.options.fillfields, this.fillfields);
                }
            }
            this._super();
        },
        /**
         * Get fields attributes
         * @override
         */
        getFillFieldsType: function () {
            var self = this,
                res = this._super();
            if (this._isValid) {
                _.each(this.fillfields, function (val, name) {
                    res.push({
                        name: name,
                        type: self.record.fields[name].type,
                        relation: self.record.fields[name].relation
                    });
                });
            }
            return res;
        },
        /**
         * @param {*} place 
         */
        handlePopulateAddress: function () {
            var self = this;
            var place = this.places_autocomplete.getPlace();
            if (place.hasOwnProperty('address_components')) {
                var requests = [];
                var google_address = this._populateAddress(place);
                var index_of_state = _.findIndex(this.target_fields, function (f) { return f.name === self.address_form.state_id });
                var target_fields = this.target_fields.slice();
                var field_state = index_of_state > -1 ? target_fields.splice(index_of_state, 1)[0] : false;

                _.each(target_fields, function (field) {
                    requests.push(self._prepareValue(field.relation, field.name, google_address[field.name]));
                });
                // Set geolocation
                var partner_geometry = this._setGeolocation(place.geometry.location.lat(), place.geometry.location.lng());
                _.each(partner_geometry, function (val, field) {
                    requests.push(self._prepareValue(false, field, val));
                });

                $.when.apply($, requests).done(function () {
                    var changes = {};
                    _.each(arguments, function (data) {
                        _.each(data, function (val, key) {
                            if (typeof val === 'object') {
                                changes[key] = val;
                            } else {
                                changes[key] = self._parseValue(val);
                            }
                        });
                    });

                    self._onUpdateWidgetFields(changes);
                    if (field_state) {
                        var country = _.has(changes, self.address_form.country_id) ? changes[self.address_form.country_id]['id'] : false;
                        var state_code = google_address[self.address_form.state_id];
                        self.setCountryState(field_state.relation, country, state_code);
                    }
                });
                this.$input.val(google_address[self.name]);
            }
        },
        initGplacesAutocomplete: function () {
            var self = this;
            setTimeout(function () {
                if (!self.places_autocomplete) {
                    self.places_autocomplete = new google.maps.places.Autocomplete(self.$input.get(0), {
                        types: ['address']
                    });
                }
                // When the user selects an address from the dropdown, populate the address fields in the form.
                self.places_autocomplete.addListener('place_changed', self.handlePopulateAddress.bind(self));
            }, 300);
        },
        /**
         * @override
         */
        isValid: function () {
            this._super.apply(this, arguments);
            var self = this,
                unknown_fields;

            unknown_fields = _.filter(_.keys(self.fillfields), function (field) {
                return !self.record.fields.hasOwnProperty(field);
            });
            if (unknown_fields.length > 0) {
                self.do_warn(_t('The following fields are invalid:'), _t('<ul><li>' + unknown_fields.join('</li><li>') + '</li></ul>'));
                this._isValid = false;
            }
            return this._isValid;
        },
        /**
         * @override
         */
        destroy: function () {
            if (this.places_autocomplete) {
                google.maps.event.clearInstanceListeners(this.places_autocomplete);
            }
            return this._super();
        }
    });

    var GplacesAutocompleteField = GplaceAutocomplete.extend({
        className: 'o_field_char o_field_google_places_autocomplete',
        setDefault: function () {
            this._super.apply(this);
            this.fillfields = {
                general: {
                    name: 'name',
                    website: 'website',
                    phone: ['international_phone_number', 'formatted_phone_number']
                },
                address: {
                    street: ['street_number', 'route'],
                    street2: ['administrative_area_level_3', 'administrative_area_level_4', 'administrative_area_level_5'],
                    city: ['locality', 'administrative_area_level_2'],
                    zip: 'postal_code',
                    state_id: 'administrative_area_level_1',
                    country_id: 'country'
                }
            };
        },
        prepareWidgetOptions: function () {
            if (this.mode === 'edit' && this.attrs.options) {
                if (this.attrs.options.hasOwnProperty('fillfields')) {
                    if (this.attrs.options.fillfields.hasOwnProperty('address')) {
                        this.fillfields['address'] = _.defaults({}, this.attrs.options.fillfields.address, this.fillfields.address);
                    }
                    if (this.attrs.options.fillfields.hasOwnProperty('general')) {
                        this.fillfields['general'] = _.defaults({}, this.attrs.options.fillfields.general, this.fillfields.general);
                    }
                    if (this.attrs.options.fillfields.hasOwnProperty('geolocation')) {
                        this.fillfields['geolocation'] = this.attrs.options.fillfields.geolocation;
                    }
                }
            }
            this._super();
        },
        getFillFieldsType: function () {
            var self = this,
                res = this._super();
            if (this._isValid) {
                for (var option in this.fillfields) {
                    _.each(this.fillfields[option], function (val, name) {
                        res.push({
                            name: name,
                            type: self.record.fields[name].type,
                            relation: self.record.fields[name].relation
                        });
                    });
                }
            }
            return res;
        },
        _setGeolocation: function (lat, lng) {
            var res = {};
            if (this.lat && this.lng) {
                return this._super(lat, lng);
            } else if (this.fillfields.geolocation) {
                _.each(this.fillfields.geolocation, function (alias, field) {
                    if (alias === 'latitude') {
                        res[field] = lat;
                    }
                    if (alias === 'longitude') {
                        res[field] = lng;
                    }
                });
            }
            return res;
        },
        handlePopulateAddress: function () {
            var self = this;
            var place = this.places_autocomplete.getPlace();
            if (place.hasOwnProperty('address_components')) {
                var values = {};
                var requests = [];
                var index_of_state = _.findIndex(this.target_fields, function (f) { return f.name === self.address_form.state_id });
                var target_fields = this.target_fields.slice();
                var field_state = index_of_state > -1 ? target_fields.splice(index_of_state, 1)[0] : false;
                // Get address
                var google_address = this._populateAddress(place, this.fillfields.address, this.fillfields_delimiter);
                _.extend(values, google_address);
                // Get place (name, website, phone)
                var google_place = this._populatePlaces(place, this.fillfields.general);
                _.extend(values, google_place);
                // Set place geolocation
                var google_geolocation = self._setGeolocation(place.geometry.location.lat(), place.geometry.location.lng());
                _.extend(values, google_geolocation);

                _.each(target_fields, function (field) {
                    requests.push(self._prepareValue(field.relation, field.name, values[field.name]));
                });

                $.when.apply($, requests).done(function () {
                    var changes = {}
                    _.each(arguments, function (data) {
                        _.each(data, function (val, key) {
                            if (typeof val === 'object') {
                                changes[key] = val;
                            } else {
                                changes[key] = self._parseValue(val);
                            }
                        });
                    });
                    self._onUpdateWidgetFields(changes);
                    if (field_state) {
                        var country = _.has(changes, self.address_form.country_id) ? changes[self.address_form.country_id]['id'] : false;
                        var state_code = google_address[self.address_form.state_id];
                        self.setCountryState(field_state.relation, country, state_code);
                    }
                });
                this.$input.val(place.name);
            }
        },
        initGplacesAutocomplete: function () {
            var self = this;
            setTimeout(function () {
                if (!self.places_autocomplete) {
                    self.places_autocomplete = new google.maps.places.Autocomplete(self.$input.get(0), {
                        types: ['establishment']
                    });
                }
                // When the user selects an address from the dropdown, populate the address fields in the form.
                self.places_autocomplete.addListener('place_changed', self.handlePopulateAddress.bind(self));
            }, 300);
        },
        /**
         * @override
         */
        isValid: function () {
            this._super.apply(this, arguments);
            var self = this,
                unknown_fields;
            for (var option in this.fillfields) {
                unknown_fields = _.filter(_.keys(this.fillfields[option]), function (field) {
                    return !self.record.fields.hasOwnProperty(field);
                });
                if (unknown_fields.length > 0) {
                    self.do_warn(_t('The following fields are invalid:'), _t('<ul><li>' + unknown_fields.join('</li><li>') + '</li></ul>'));
                    this._isValid = false;
                }
            }
            return this._isValid;
        },
        /**
         * @override
         */
        destroy: function () {
            if (this.places_autocomplete) {
                google.maps.event.clearInstanceListeners(this.places_autocomplete);
            }
            return this._super();
        }
    });

    return {
        GplacesAddressAutocompleteField: GplaceAddressAutocompleteField,
        GplacesAutocompleteField: GplacesAutocompleteField
    };

});
