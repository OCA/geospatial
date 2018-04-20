# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Vaucher (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models
from odoo import api


GEO_VIEW = ('geoengine', 'GeoEngine')


class IrUIView(models.Model):
    _inherit = 'ir.ui.view'

    @api.model
    def _setup_fields(self, partial):
        """Hack due since the field 'type' is not defined with the new api.
        """
        cls = type(self)
        type_selection = cls._fields['type'].selection
        if GEO_VIEW not in type_selection:
            tmp = list(type_selection)
            tmp.append(GEO_VIEW)
            cls._fields['type'].selection = tuple(set(tmp))
        super(IrUIView, self)._setup_fields(partial)

    raster_layer_ids = fields.One2many(
        'geoengine.raster.layer', 'view_id', 'Raster layers', required=False)

    vector_layer_ids = fields.One2many(
        'geoengine.vector.layer', 'view_id', 'Vector layers', required=True)

    projection = fields.Char(default="EPSG:900913", required=True)
    default_extent = fields.Char(
        'Default map extent', size=128,
        default='-123164.85222423, 5574694.9538936, 1578017.6490538,'
        ' 6186191.1800898'
    )
    default_zoom = fields.Integer(
        'Default map zoom',
    )
    restricted_extent = fields.Char(
        'Restricted map extent', size=128,
    )
