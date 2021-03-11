# Copyright Yopi Angi
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, models, fields


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    google_maps_drawing = fields.Boolean(string='Drawing')

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()
        libraries = self._set_google_maps_drawing()
        ICPSudo.set_param('google.maps_libraries', libraries)

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        lib_drawing = self._get_google_maps_drawing()
        res['google_maps_drawing'] = lib_drawing
        return res

    @api.model
    def _get_google_maps_drawing(self):
        ICPSudo = self.env['ir.config_parameter'].sudo()
        google_maps_libraries = ICPSudo.get_param(
            'google.maps_libraries', default='')
        libraries = google_maps_libraries.split(',')
        return 'drawing' in libraries

    @api.multi
    def _set_google_maps_drawing(self):
        ICPSudo = self.env['ir.config_parameter'].sudo()
        google_maps_libraries = ICPSudo.get_param(
            'google.maps_libraries', default='')
        libraries = google_maps_libraries.split(',')
        if self.google_maps_drawing:
            libraries.append('drawing')
        result = ','.join(libraries)
        return result
