# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, fields, models

GMAPS_LANG_LOCALIZATION = [
    ('af', 'Afrikaans'),
    ('ja', 'Japanese'),
    ('sq', 'Albanian'),
    ('kn', 'Kannada'),
    ('am', 'Amharic'),
    ('kk', 'Kazakh'),
    ('ar', 'Arabic'),
    ('km', 'Khmer'),
    ('ar', 'Armenian'),
    ('ko', 'Korean'),
    ('az', 'Azerbaijani'),
    ('ky', 'Kyrgyz'),
    ('eu', 'Basque'),
    ('lo', 'Lao'),
    ('be', 'Belarusian'),
    ('lv', 'Latvian'),
    ('bn', 'Bengali'),
    ('lt', 'Lithuanian'),
    ('bs', 'Bosnian'),
    ('mk', 'Macedonian'),
    ('bg', 'Bulgarian'),
    ('ms', 'Malay'),
    ('my', 'Burmese'),
    ('ml', 'Malayalam'),
    ('ca', 'Catalan'),
    ('mr', 'Marathi'),
    ('zh', 'Chinese'),
    ('mn', 'Mongolian'),
    ('zh-CN', 'Chinese (Simplified)'),
    ('ne', 'Nepali'),
    ('zh-HK', 'Chinese (Hong Kong)'),
    ('no', 'Norwegian'),
    ('zh-TW', 'Chinese (Traditional)'),
    ('pl', 'Polish'),
    ('hr', 'Croatian'),
    ('pt', 'Portuguese'),
    ('cs', 'Czech'),
    ('pt-BR', 'Portuguese (Brazil)'),
    ('da', 'Danish'),
    ('pt-PT', 'Portuguese (Portugal)'),
    ('nl', 'Dutch'),
    ('pa', 'Punjabi'),
    ('en', 'English'),
    ('ro', 'Romanian'),
    ('en-AU', 'English (Australian)'),
    ('ru', 'Russian'),
    ('en-GB', 'English (Great Britain)'),
    ('sr', 'Serbian'),
    ('et', 'Estonian'),
    ('si', 'Sinhalese'),
    ('fa', 'Farsi'),
    ('sk', 'Slovak'),
    ('fi', 'Finnish'),
    ('sl', 'Slovenian'),
    ('fil', 'Filipino'),
    ('es', 'Spanish'),
    ('fr', 'French'),
    ('es-419', 'Spanish (Latin America)'),
    ('fr-CA', 'French (Canada)'),
    ('sw', 'Swahili'),
    ('gl', 'Galician'),
    ('sv', 'Swedish'),
    ('ka', 'Georgian'),
    ('ta', 'Tamil'),
    ('de', 'German'),
    ('te', 'Telugu'),
    ('el', 'Greek'),
    ('th', 'Thai'),
    ('gu', 'Gujarati'),
    ('tr', 'Turkish'),
    ('iw', 'Hebrew'),
    ('uk', 'Ukrainian'),
    ('hi', 'Hindi'),
    ('ur', 'Urdu'),
    ('hu', 'Hungarian'),
    ('uz', 'Uzbek'),
    ('is', 'Icelandic'),
    ('vi', 'Vietnamese'),
    ('id', 'Indonesian'),
    ('zu', 'Zulu'),
    ('it', 'Italian'),
]


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    @api.model
    def get_region_selection(self):
        country_ids = self.env['res.country'].search([])
        values = [(country.code, country.name) for country in country_ids]
        return values

    google_maps_view_api_key = fields.Char(string='Google Maps View Api Key')
    google_maps_lang_localization = fields.Selection(
        selection=GMAPS_LANG_LOCALIZATION,
        string='Google Maps Language Localization')
    google_maps_region_localization = fields.Selection(
        selection=get_region_selection,
        string='Google Maps Region Localization')
    google_maps_theme = fields.Selection(
        selection=[('default', 'Default'),
                   ('aubergine', 'Aubergine'),
                   ('night', 'Night'),
                   ('dark', 'Dark'),
                   ('retro', 'Retro'),
                   ('silver', 'Silver')],
        string='Map theme')
    google_maps_places = fields.Boolean(string='Places', default=True)
    google_maps_geometry = fields.Boolean(string='Geometry', default=True)
    module_web_widget_google_address_autocomplete = fields.Boolean(
        string="Allow Google Address Form Autocomplete")
    module_web_widget_google_marker_icon_picker = fields.Boolean(
        string="Allow Google Marker Icon Picker")
    module_web_view_google_map = fields.Boolean(
        string="Allow Google Map View")

    @api.onchange('google_maps_lang_localization')
    def onchange_lang_localization(self):
        if not self.google_maps_lang_localization:
            self.google_maps_region_localization = ''

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()
        lang_localization = self._set_google_maps_lang_localization()
        region_localization = self._set_google_maps_region_localization()

        lib_places = self._set_google_maps_places()
        lib_geometry = self._set_google_maps_geometry()

        active_libraries = '%s,%s' % (lib_geometry, lib_places)

        ICPSudo.set_param('google.api_key_geocode',
                          self.google_maps_view_api_key)
        ICPSudo.set_param('google.lang_localization',
                          lang_localization)
        ICPSudo.set_param('google.region_localization',
                          region_localization)
        ICPSudo.set_param('google.maps_theme', self.google_maps_theme)
        ICPSudo.set_param('google.maps_libraries', active_libraries)

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()

        lang_localization = self._get_google_maps_lang_localization()
        region_localization = self._get_google_maps_region_localization()

        lib_places = self._get_google_maps_places()
        lib_geometry = self._get_google_maps_geometry()

        res.update({
            'google_maps_view_api_key': ICPSudo.get_param(
                'google.api_key_geocode', default=''),
            'google_maps_lang_localization': lang_localization,
            'google_maps_region_localization': region_localization,
            'google_maps_theme': ICPSudo.get_param(
                'google.maps_theme', default='default'),
            'google_maps_places': lib_places,
            'google_maps_geometry': lib_geometry
        })
        return res

    @api.multi
    def _set_google_maps_lang_localization(self):
        if self.google_maps_lang_localization:
            lang_localization = '&language=%s' % \
                                self.google_maps_lang_localization
        else:
            lang_localization = ''

        return lang_localization

    @api.model
    def _get_google_maps_lang_localization(self):
        ICPSudo = self.env['ir.config_parameter'].sudo()
        google_maps_lang = ICPSudo.get_param(
            'google.lang_localization', default='')
        val = google_maps_lang.split('=')
        lang = val and val[-1] or ''
        return lang

    @api.multi
    def _set_google_maps_region_localization(self):
        if self.google_maps_region_localization:
            region_localization = '&region=%s' % \
                                  self.google_maps_region_localization
        else:
            region_localization = ''

        return region_localization

    @api.model
    def _get_google_maps_region_localization(self):
        ICPSudo = self.env['ir.config_parameter'].sudo()
        google_maps_region = ICPSudo.get_param(
            'google.region_localization', default='')
        val = google_maps_region.split('=')
        region = val and val[-1] or ''
        return region

    @api.model
    def _get_google_maps_geometry(self):
        ICPSudo = self.env['ir.config_parameter'].sudo()
        google_maps_libraries = ICPSudo.get_param(
            'google.maps_libraries', default='')
        libraries = google_maps_libraries.split(',')
        return 'geometry' in libraries

    @api.multi
    def _set_google_maps_geometry(self):
        return 'geometry' if self.google_maps_geometry else ''

    @api.model
    def _get_google_maps_places(self):
        ICPSudo = self.env['ir.config_parameter'].sudo()
        google_maps_libraries = ICPSudo.get_param(
            'google.maps_libraries', default='')
        libraries = google_maps_libraries.split(',')
        return 'places' in libraries

    @api.multi
    def _set_google_maps_places(self):
        return 'places' if self.google_maps_places else ''
