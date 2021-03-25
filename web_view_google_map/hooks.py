# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, SUPERUSER_ID

def uninstall_hook(cr, registry):
    cr.execute("UPDATE ir_act_window "
               "SET view_mode=replace(view_mode, ',map', '')"
               "WHERE view_mode LIKE '%,map%';")
    cr.execute("UPDATE ir_act_window "
               "SET view_mode=replace(view_mode, 'map,', '')"
               "WHERE view_mode LIKE '%map,%';")
    cr.execute("DELETE FROM ir_act_window "
               "WHERE view_mode = 'map';")

def pre_init_hook(cr):
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


def post_init_hook(cr, registry):
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
