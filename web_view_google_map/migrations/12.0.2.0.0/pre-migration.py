# Copyright (C) 2020 Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, SUPERUSER_ID


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    config_params = env['ir.config_parameter'].\
        search([('key', 'in', ['google.api_key_geocode',
                               'google.fsm_key_autocomplete'])])
    if config_params:
        for param in config_params:
            if param.key == 'google.api_key_geocode':
                val = param.value
                param.unlink()
                env['ir.config_parameter'].create({'key': 'temp_key_geo', 'value': val})
            else:
                val = param.value
                param.unlink()
                env['ir.config_parameter'].create({'key': 'temp_key_auto', 'value': val})
