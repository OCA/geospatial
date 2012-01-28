# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields, osv

from base_geoengine import geo_model

class ResPartnerAddress(geo_model.GeoModel):
    """GEO OSV SAMPLE"""
    _name = "res.partner.address"
    _inherit = "res.partner.address"
    _columns = {'geo_point' : fields.geo_point('Coordinate')}
ResPartnerAddress()
