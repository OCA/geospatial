odoo.define('web_widget_google_address_autocomplete.address_form_autocomplete', function (require) {
    'use strict';

    var ajax = require('web.ajax');
    var Class = require('web.Class');

    var componentForm = {
        street_number: 'long_name',
        route: 'long_name',
        intersection: 'short_name',
        political: 'short_name',
        country: 'short_name',
        administrative_area_level_1: 'long_name',
        administrative_area_level_2: 'short_name',
        administrative_area_level_3: 'short_name',
        administrative_area_level_4: 'short_name',
        administrative_area_level_5: 'short_name',
        colloquial_area: 'short_name',
        locality: 'short_name',
        ward: 'short_name',
        sublocality_level_1: 'short_name',
        sublocality_level_2: 'short_name',
        sublocality_level_3: 'short_name',
        sublocality_level_5: 'short_name',
        neighborhood: 'short_name',
        premise: 'short_name',
        postal_code: 'short_name',
        natural_feature: 'short_name',
        airport: 'short_name',
        park: 'short_name',
        point_of_interest: 'long_name'
    };

    var AddressForm = Class.extend({
        init: function ($target, fill_fields) {
            this.$target = $target;
            this.place_autocomplete = false;
            this.fillFields = fill_fields || {};
            this.componentForm = componentForm;
            this.country_restrictions = [];
            this.onLoad();
        },
        onLoad: function () {
            var self = this;
            ajax.jsonRpc('/gplaces/country_restrictions', 'call', {}).then(function (res) {
                self.country_restrictions.push.apply(self.country_restrictions, res);
                self.initAutocomplete(res);
                self.geolocate();
            });
        },
        geolocate: function () {
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
                    self.place_autocomplete.setBounds(circle.getBounds());
                });
            }
        },
        initAutocomplete: function (country_restrictions) {
            // Create the autocomplete object, restricting the search to geographical
            // location types.
            this.place_autocomplete = new google.maps.places.Autocomplete(
                (this.$target[0]), {
                    types: ['geocode'],
                }
            );

            // Add country restrictions if any
            if (country_restrictions.length) {
                this.place_autocomplete.setComponentRestrictions({
                    'country': country_restrictions
                });
            }

            // When the user selects an address from the dropdown, populate the address
            // fields in the form.
            this.place_autocomplete.addListener('place_changed', this.fillInAddress.bind(this));
        },
        fillInAddress: function () {
            var self = this;
            var place = this.place_autocomplete.getPlace();

            if (place && place.hasOwnProperty('address_components')) {
                var address = self.populateAddress(place);
                var requests = [];

                _.each(self.fillFields, function (value, key) {
                    requests.push(self.prepareValue(key, address));
                });

                $.when.apply($, requests).done(function () {
                    $.each(arguments, function (_, values) {
                        $.each(values, function (key, value) {
                            if (key === 'country_id') {
                                $(self.fillFields[key].selector).val(value).change();
                            } else if (key === 'state_id') {
                                // delay 1000ms
                                // waiting the states loaded completely before set a value to state_id
                                setTimeout(function () {
                                    $(self.fillFields[key].selector).val(value);
                                }, 1000);
                            } else {
                                $(self.fillFields[key].selector).val(value);
                            }
                        });
                    });
                });
                self.$target.val(place.name);
            }
        },
        prepareValue: function (input, value) {
            var def = $.Deferred();
            var res = {};
            if (['country_id', 'state_id'].indexOf(input) !== -1) {
                if (input === 'country_id') {
                    ajax.jsonRpc('/my/account/get_country', 'call', {
                        'country': value[input]
                    }).then(function (country_id) {
                        res[input] = country_id ? country_id.toString() : '';
                        def.resolve(res);
                    });
                }
                if (input === 'state_id') {
                    ajax.jsonRpc('/my/account/get_country_state', 'call', {
                        'state': value[input],
                        'country': value['country_id']
                    }).then(function (state_id) {
                        res[input] = state_id ? state_id.toString() : '';
                        def.resolve(res);
                    });
                }
            } else {
                res[input] = value[input];
                def.resolve(res);
            }
            return def;
        },
        populateAddress: function (place) {
            var self = this,
                input2fill = {},
                result = {},
                fields_delimiter = {
                    street: ' ',
                    street2: ', '
                }, temp, options, dlmter;

            _.each(this.fillFields, function (value, key) {
                input2fill[key] = [];
            });

            _.each(this.fillFields, function (options, field) {
                // turn all fields options into an Array
                options = _.flatten([options.components]);
                temp = {};
                _.each(place.address_components, function (component) {
                    _.each(_.intersection(options, component.types), function (match) {
                        temp[match] = component[self.componentForm[match]] || false;
                    });
                });
                input2fill[field] = _.map(options, function (item) {
                    return temp[item];
                });
            });

            _.each(input2fill, function (value, key) {
                dlmter = fields_delimiter[key] || ' ';
                if (key == 'city') {
                    result[key] = _.first(_.filter(value)) || '';
                } else {
                    result[key] = _.filter(value).join(dlmter);
                }
            });

            return result;
        }
    });

    return {
        'AddressForm': AddressForm,
        'componentForm': componentForm
    };
});

odoo.define('web_widget_google_address_autocomplete.website_portal_form', function (require) {
    'use strict';

    require('web.dom_ready');
    var GooglePlacesAutocomplete = require('web_widget_google_address_autocomplete.address_form_autocomplete');

    if (!$('.o_portal_wrap').length) {
        return $.Deferred().reject("DOM doesn't contains '.o_portal_wrap'");
    }

    var streetFillInputs = {
        street: {
            selector: 'input[name="street"]',
            components: ['street_number', 'route']
        },
        street2: {
            selector: 'input[name="street2"]',
            components: ['administrative_area_level_3', 'administrative_area_level_4', 'administrative_area_level_5']
        },
        city: {
            selector: 'input[name="city"]',
            components: ['locality', 'administrative_area_level_2']
        },
        zipcode: {
            selector: 'input[name="zipcode"]',
            components: ['postal_code']
        },
        country_id: {
            selector: 'select[name="country_id"]',
            components: ['country']
        },
        state_id: {
            selector: 'select[name="state_id"]',
            components: ['administrative_area_level_1']
        }
    };

    $(document).ready(function () {
        // disabled submit form when user press 'enter' key
        $('.o_portal_wrap').find('form').on('keypress', function (ev) {
            var key_code = ev.keyCode || ev.which;
            if (key_code === 13) {
                ev.preventDefault();
                return false;
            }
        });
        $('input[name="street"]').on('focus', function () {
            new GooglePlacesAutocomplete.AddressForm($(this), streetFillInputs);
        });
    });

});

odoo.define('web_widget_google_address_autocomplete.website_sale_form', function (require) {
    'use strict';

    require('web.dom_ready');
    var GooglePlacesAutocomplete = require('web_widget_google_address_autocomplete.address_form_autocomplete');

    if (!$('.oe_website_sale').length) {
        return $.Deferred().reject("DOM doesn't contains '.oe_website_sale'");
    }

    var streetFillInputs = {
        street: {
            selector: 'input[name="street"]',
            components: ['street_number', 'route']
        },
        street2: {
            selector: 'input[name="street2"]',
            components: ['administrative_area_level_3', 'administrative_area_level_4', 'administrative_area_level_5']
        },
        city: {
            selector: 'input[name="city"]',
            components: ['locality', 'administrative_area_level_2']
        },
        zip: {
            selector: 'input[name="zip"]',
            components: ['postal_code']
        },
        country_id: {
            selector: 'select[name="country_id"]',
            components: ['country']
        },
        state_id: {
            selector: 'select[name="state_id"]',
            components: ['administrative_area_level_1']
        }
    };

    $(document).ready(function () {
        $('input[name="street"]').on('focus', function () {
            new GooglePlacesAutocomplete.AddressForm($(this), streetFillInputs);
        });
    });

});