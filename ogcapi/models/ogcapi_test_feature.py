from odoo import fields, models


class OgcapiTestFeature(models.Model):
    _name = "ogcapi.test.feature"
    _description = "Test Feature for OGCAPI Tests"

    name = fields.Char(required=True)
    the_geom = fields.GeoPoint()
