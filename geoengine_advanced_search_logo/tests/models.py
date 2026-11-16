# Copyright 2026 mytime.click
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models


class GeoSearchLogoTest(models.Model):
    _name = "geoengine.advanced.search.logo.test"
    _description = "Geoengine Advanced Search Logo Test"

    name = fields.Char()
    logo = fields.Image(max_width=128, max_height=128)
    the_geom = fields.GeoPolygon("Geom Boundaries")


class GeoSearchNoLogoTest(models.Model):
    _name = "geoengine.advanced.search.nologo.test"
    _description = "Geoengine Advanced Search Test Without Image"

    name = fields.Char()
    the_geom = fields.GeoPoint("Geo Point")


class GeoSearchAvatarTest(models.Model):
    _name = "geoengine.advanced.search.avatar.test"
    _description = "Geoengine Advanced Search Avatar Test"

    name = fields.Char()
    image_128 = fields.Image(max_width=128, max_height=128)
    avatar_128 = fields.Image(max_width=128, max_height=128)
    the_geom = fields.GeoPoint("Geo Point")
