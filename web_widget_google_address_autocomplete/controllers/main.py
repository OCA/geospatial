# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import http
from odoo.http import request
from odoo.tools.safe_eval import safe_eval


class WebsiteGoogleAddressForm(http.Controller):

    @http.route('/my/account/get_country', type='json', auth='public')
    def get_country(self, country):
        country_id = request.env['res.country'].sudo().search([
            '|', ('code', '=', country), ('name', '=', country)])
        return country_id and country_id.id or False

    @http.route('/my/account/get_country_state', type='json', auth='public')
    def get_country_state(self, country, state):
        country_id = request.env['res.country'].sudo().search([
            '|', ('code', '=', country), ('name', '=', country)])
        state_id = request.env['res.country.state'].sudo().search([
            '&', '|', ('code', '=', state), ('name', '=', state),
            ('country_id', '=', country_id.id)])
        return state_id and state_id.id or False

    @http.route('/gplaces/country_restrictions', type='json', auth='public')
    def get_gmap_country_restriction(self):
        countries = request.env['ir.config_parameter'].sudo().get_param(
            'google.country_restriction', default='[]')
        list_countries = safe_eval(countries)
        if list_countries:
            countries_code = [country[1] for country in list_countries]
            return countries_code
        return []
