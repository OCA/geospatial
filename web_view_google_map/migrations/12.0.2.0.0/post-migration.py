# Copyright (C) 2020 Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, SUPERUSER_ID

def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    config_params = env['ir.config_parameter'].\
        search([('key', 'in', ['temp_key_geo',
                               'temp_key_auto'])])
    if config_params:
        for param in config_params:
            if param.key == 'temp_key_geo':
                geocode = env.ref('web_view_google_map.google_geocode_parameter')
                geocode.write({'value': param.value})
                param.unlink()
            else:
                geocode = env.ref('web_view_google_map.google_autocomplete_parameter')
                geocode.write({'value': param.value})
                param.unlink()
