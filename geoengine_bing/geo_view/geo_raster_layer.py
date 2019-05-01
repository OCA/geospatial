# Copyright 2019 MuK IT GmbH - Kerrim Abd El-Hamed
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import logging

from odoo import _, models, api, fields
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

class GeoengineRasterLayer(models.Model):
    
    _inherit = "geoengine.raster.layer"
    
    #===========================================================================
    # Variables
    #===========================================================================
    
    raster_type = fields.Selection(selection_add=[('bing', 'Bing')])
    is_bing = fields.Boolean(compute='_compute_is_bing')
    
    bing_imagery_set = fields.Selection([
        ('Road', 'Road'),
        ('RoadOnDemand', 'Road on demand'),
        ('Aerial', 'Aerial'),
        ('AerialWithLabels', 'Aerial with labels'),
        ('collins Bart', 'Collins Bart'),
        ('ordnanceSurvey', 'Ordnance Survey')
        ], string="Imagery Set", default="AerialWithLabels")
    
    bing_key = fields.Char()

    #===========================================================================
    # Computed Fields
    #===========================================================================
    
    @api.multi
    @api.depends('raster_type')
    def _compute_is_bing(self):
        for rec in self:
            rec.is_bing = rec.raster_type == 'bing'
