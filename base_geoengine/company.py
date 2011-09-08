# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields, osv
from tools.translate import _
import geo_model
class ResCompany(geo_model.GeoModel):
    """override company to add default projection yet still text"""
    _name = "res.company"
    _inherit = "res.company"
    _columns = {
        # show the default
        'geoengine_base_info' : fields.text('General informations about GeoEngine',
                                             size=16, required=False, readonly=True),
        'comp_location' : fields.geo_point('Coordinate'),

    }    
    _defaults = {'geoengine_base_info': lambda *a: 'NOT IMPLEMENTED YET'}
ResCompany()