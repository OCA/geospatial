# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, fields, models
from odoo.tools.safe_eval import safe_eval


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    google_maps_country_restriction = fields.Many2many(
        'res.country', string='Country Restriction')

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()
        country_restriction = self._set_google_maps_country_restriction()
        ICPSudo.set_param('google.country_restriction', country_restriction)

    @api.multi
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        country_restriction = self._get_google_maps_country_restriction()
        res['google_maps_country_restriction'] = country_restriction
        return res

    @api.multi
    def _set_google_maps_country_restriction(self):
        countries = [(country.id, country.code)
                     for country in self.google_maps_country_restriction]
        return countries

    @api.multi
    def _get_google_maps_country_restriction(self):
        ICPSudo = self.env['ir.config_parameter'].sudo()
        countries = ICPSudo.get_param('google.country_restriction',
                                      default='[]')
        list_countries = safe_eval(countries)
        if list_countries:
            values = [country[0] for country in list_countries]
            return [(6, 0, values)]
        return [(5, 0, 0)]
