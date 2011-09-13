# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from osv import fields, osv


GEO_VIEW = ('geo_map_view', 'GeoEngine')

class IrUIView(osv.osv):
    _inherit = 'ir.ui.view'

    def __init__(self, pool, cursor):
        """Hack due to the lack of selection fields inheritance mechanism."""
        super(IrUIView, self).__init__(pool, cursor)
        type_selection = self._columns['type'].selection
        if GEO_VIEW not in type_selection:
            tmp = list(type_selection)
            tmp.append(GEO_VIEW)
            tmp.sort()
            self._columns['type'].selection = tuple(set(tmp))

    _columns = {'raster_layer_ids': fields.one2many('geoengine.raster.layer',
                                                    'view_id',
                                                    'Raster layers',
                                                    required=False),

                'vector_layer_ids': fields.one2many('geoengine.vector.layer',
                                                    'view_id',
                                                    'Vector layers',
                                                    required=True)}


IrUIView()
