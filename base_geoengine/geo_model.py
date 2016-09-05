# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################

from openerp import models
from openerp.exceptions import except_orm, MissingError
from openerp.osv import fields
from openerp.tools.translate import _
from . import geo_operators
from . import fields as geo_fields


DEFAULT_EXTENT = '-123164.85222423, 5574694.9538936, ' \
    '1578017.6490538, 6186191.1800898'


class GeoModel(models.BaseModel):
    """Base class for all models defining geo fields.
    """

    # Array of ash that define layer and data to use
    _georepr = []
    _name = None
    _auto = True
    # not visible in ORM registry, meant to be python-inherited only
    _register = False
    _transient = False  # True in a TransientModel

    def _auto_init(self, cursor, context=None):
        """Initialize the columns in dB and Create the GIST index
        only create and update supported

        We override the base methid  because creation of fields in DB is not
        actually delegated to the field it self but to the ORM _auto_init
        function
        """
        columns = {}
        geo_columns = {}
        tmp = {}
        for kol in self._columns:
            tmp[kol] = self._columns[kol]
            k_obj = self._columns[kol]
            if k_obj._type.startswith('geo_'):
                geo_columns[kol] = self._columns[kol]
            else:
                columns[kol] = self._columns[kol]
        self._columns = columns
        res = super(GeoModel, self)._auto_init(cursor, context)
        column_data = self._select_column_data(cursor)
        for kol in geo_columns:
            if not isinstance(geo_columns[kol], fields.function):
                fct = geo_columns[kol].create_geo_column
                if kol in column_data:
                    fct = geo_columns[kol].update_geo_column
                fct(cursor, kol, geo_columns[kol], self._table, self._name)
        self._columns = tmp
        self._field_create(cursor, context)
        return res

    def fields_get(self, cursor, uid, allfields=None, context=None):
        """Add geo_type definition for geo fields"""
        res = super(GeoModel, self).fields_get(
            cursor, uid, allfields=allfields, context=context)
        for field in res:
            if field in self._columns:
                col = self._columns[field]
                if col._type.startswith('geo_'):
                    if isinstance(col, (fields.function, fields.related)):
                        res[field]['geo_type'] = {'type': col._type,
                                                  'dim': col.dim or 2,
                                                  'srid': col.srid or 900913}
                    else:
                        res[field]['geo_type'] = {'type': col._geo_type,
                                                  'dim': col._dim,
                                                  'srid': col._srid}
        return res

    def _get_geo_view(self, cursor, uid):
        view_obj = self.pool.get('ir.ui.view')
        geo_view_id = view_obj.search(cursor,
                                      uid,
                                      [('model', '=', self._name),
                                       ('type', '=', 'geoengine')])
        if not geo_view_id:
            raise except_orm(
                _('No GeoEngine view defined for the model %s') % self._name,
                _('Please create a view or modify view mode'))
        return view_obj.browse(cursor, uid, geo_view_id[0])

    def fields_view_get(self, cursor, uid, view_id=None, view_type='form',
                        context=None, toolbar=False, submenu=False):
        """Returns information about the available fields of the class.
           If view type == 'map' returns geographical columns available"""
        view_obj = self.pool.get('ir.ui.view')
        raster_obj = self.pool.get('geoengine.raster.layer')
        vector_obj = self.pool.get('geoengine.vector.layer')
        field_obj = self.pool.get('ir.model.fields')

        def set_field_real_name(in_tuple):
            if not in_tuple:
                return in_tuple
            name = field_obj.read(cursor, uid, in_tuple[0], ['name'])['name']
            out = (in_tuple[0], name, in_tuple[1])
            return out
        if view_type == "geoengine":
            if not view_id:
                view = self._get_geo_view(cursor, uid)
            else:
                view = view_obj.browse(cursor, uid, view_id)
            res = super(GeoModel, self).fields_view_get(
                cursor, uid, view.id, 'form', context, toolbar, submenu)
            res['geoengine_layers'] = {}
            res['geoengine_layers']['backgrounds'] = []
            res['geoengine_layers']['actives'] = []
            default_extent = (view.default_extent or DEFAULT_EXTENT).split(',')
            res['geoengine_layers']['default_extent'] = [
                float(x) for x in default_extent]
            # TODO find why context in read does not work with webclient
            for layer in view.raster_layer_ids:
                layer_dict = raster_obj.read(cursor, uid, layer.id)
                res['geoengine_layers']['backgrounds'].append(layer_dict)
            for layer in view.vector_layer_ids:
                layer_dict = vector_obj.read(cursor, uid, layer.id)
                layer_dict['attribute_field_id'] = set_field_real_name(
                    layer_dict.get('attribute_field_id', False))
                layer_dict['geo_field_id'] = set_field_real_name(
                    layer_dict.get('geo_field_id', False))
                res['geoengine_layers']['actives'].append(layer_dict)
                # adding geo column desc
                geo_f_name = layer_dict['geo_field_id'][1]
                res['fields'].update(
                    self.fields_get(cursor, uid, [geo_f_name]))
        else:
            return super(GeoModel, self).fields_view_get(
                cursor, uid, view_id, view_type, context, toolbar, submenu)
        return res

    def get_edit_info_for_geo_column(self, cursor, uid, column, context=None):
        res = {}
        raster_obj = self.pool['geoengine.raster.layer']

        field = self._fields.get(column)
        if not field or not isinstance(field, geo_fields.GeoField):
            raise ValueError(
                _("%s column does not exists or is not a geo field") % column)
        view = self._get_geo_view(cursor, uid)
        raster_id = raster_obj.search(cursor, uid,
                                      [('view_id', '=', view.id),
                                       ('use_to_edit', '=', True)],
                                      context=context)
        if not raster_id:
            raster_id = raster_obj.search(cursor, uid,
                                          [('view_id', '=', view.id)],
                                          context=context)
        if not raster_id:
            raise MissingError(_('No raster layer for view %s') % (view.name,))
        res['edit_raster'] = raster_obj.read(
            cursor, uid, raster_id[0], context=context)
        res['geo_type'] = field.geo_type
        res['srid'] = field.srid
        res['default_extent'] = view.default_extent
        return res

    def geo_search(self, cursor, uid, domain=None, geo_domain=None, offset=0,
                   limit=None, order=None, context=None):
        """Perform a geo search it allows direct domain:
           geo_search(r, uid,
           domaine=[('name', 'ilike', 'toto']),
           geo_domain=[('the_point', 'geo_intersect',
                         myshaply_obj or mywkt or mygeojson)])

           We can also support indirect geo_domain (
              ‘geom’, ‘geo_operator’, {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })

           The supported operators are :
            * geo_greater
            * geo_lesser
            * geo_equal
            * geo_touch
            * geo_within
            * geo_contains
            * geo_intersect"""
        # First we do a standard search in order to apply security rules
        # and do a search on standard attributes
        # Limit and offset are managed after, we may loose a lot of performance
        # here
        domain = domain or []
        geo_domain = geo_domain or []
        return geo_operators.geo_search(
            self, cursor, uid, domain=domain, geo_domain=geo_domain,
            offset=offset, limit=limit, order=order, context=context)
