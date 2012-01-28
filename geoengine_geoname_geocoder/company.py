# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields, osv
from tools.translate import _

class ResCompany(osv.osv):
    """Override company to activate deactivate GeoNames geocoding"""
    _name = "res.company"
    _inherit = "res.company"
    _columns = {'enable_geocoding' : fields.boolean('Enable Addresse Geocoding')}
    _defaults = {'enable_geocoding': True}
ResCompany()