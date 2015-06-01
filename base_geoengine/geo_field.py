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
import logging

try:
    from shapely.wkb import loads as wkbloads
    import geojson
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning('Shapely or geojson are not available in the sys path')

from openerp.osv import fields
from openerp.tools.translate import _

from .geo_helper import geo_convertion_helper as convert
from . import geo_operators

logger = logging.getLogger('geoengine.database.structure')
exp_logger = logging.getLogger('geoengine.expression')


class Geom(fields._column):

    """New type of column in the  ORM for POSTGIS geometry type"""

    def load_geo(self, wkb):
        """Load geometry into browse record after read was done"""
        return wkb and wkbloads(wkb.decode('hex')) or False

    def set_geo(self, value):
        """Transform data to a format compatible with the create function.

        It is also use in expression.py in order to represent value."""
        if not value:
            return None
        res = self.entry_to_shape(value, same_type=True)
        if res.is_empty:
            return None
        return res.wkt

    _type = None
    _classic_read = False
    _classic_write = True
    _symbol_c = u' %s'
    # Due to the conception of the orm we have to set symbol set as an instance
    # variable instead of a class variable_symbol_set = (' ST_GeomFromText(%s)'
    # , set_geo)
    _symbol_get = load_geo
    _fnct_inv = True

    # geometry type of postgis point, multipolygon, etc...
    _geo_type = None

    def __init__(self, string, dim=2, srid=900913, gist_index=True,
                 **args):
        fields._column.__init__(self, string, **args)
        # 2d, 3d, 4d, given by an int
        self._dim = dim
        # EPSG projection id
        self._srid = srid
        self._gist_index = gist_index
        self._symbol_set = (
            u' ST_GeomFromText(%s,' + unicode(self._srid) + ')', self.set_geo)
        self._geo_operator = geo_operators.GeoOperator(self)

    def entry_to_shape(self, value, same_type=False):
        """Transform input into an object"""
        shape = convert.value_to_shape(value)
        if same_type and not shape.is_empty:
            if shape.geom_type.lower() != self._geo_type.lower():
                msg = _('Geo Value %s must be of the same type %s as fields')
                raise TypeError(msg % (shape.geom_type.lower(),
                                       self._geo_type.lower()))
        return shape

    def _postgis_index_name(self, table, col_name):
        return "%s_%s_gist_index" % (table, col_name)

    def _create_index(self, cursor, table, col_name):
        if self._gist_index:
            try:
                cursor.execute("CREATE INDEX %s ON %s USING GIST ( %s )" %
                               (self._postgis_index_name(table, col_name),
                                table,
                                col_name))
            except Exception:
                cursor.rollback()
                logger.exception(
                    'Cannot create gist index for col %s table %s:',
                    col_name, table)
                raise
            finally:
                cursor.commit()

    def create_geo_column(self, cursor, col_name, geo_column, table, model):
        """Create a columns of type the geom"""
        try:
            cursor.execute("SELECT AddGeometryColumn( %s, %s, %s, %s, %s)",
                           (table,
                            col_name,
                            geo_column._srid,
                            geo_column._geo_type,
                            geo_column._dim))
            self._create_index(cursor, table, col_name)
        except Exception:
            cursor.rollback()
            logger.exception('Cannot create column %s table %s:',
                             col_name, table)
            raise
        finally:
            cursor.commit()

        return True

    def update_geo_column(self, cursor, col_name, geo_column, table, model):
        """Update the column type in the database.
        """
        query = ("""SELECT srid, type, coord_dimension
                 FROM geometry_columns
                 WHERE f_table_name = %s
                 AND f_geometry_column = %s""")
        cursor.execute(query, (table, col_name))
        check_data = cursor.fetchone()
        if not check_data:
            raise TypeError(
                "geometry_columns table seems to be corrupted. "
                "SRID check is not possible")
        if check_data[0] != geo_column._srid:
            raise TypeError(
                "Reprojection of column is not implemented"
                "We can not change srid %s to %s" % (
                    geo_column._srid, check_data[0]))
        if check_data[1] != geo_column._geo_type:
            raise TypeError(
                "Geo type modification is not implemented"
                "We can not change type %s to %s" % (
                    check_data[1], geo_column._type))
        if check_data[2] != geo_column._dim:
            raise TypeError(
                "Geo dimention modification is not implemented"
                "We can not change dimention %s to %s" % (
                    check_data[2], geo_column._dim))
        if self._gist_index:
            cursor.execute(
                "SELECT indexname FROM pg_indexes WHERE indexname = %s",
                (self._postgis_index_name(table, col_name),))
            index = cursor.fetchone()
            if index:
                return True
            self._create_index(cursor, table, col_name)
        return True

    def set(self, cr, obj, res_id, name, value, user=None, context=None):
        """Write and create value into database

        value can be geojson, wkt, shapely geomerty object.
        If geo_direct_write in context you can pass diretly WKT"""
        # TO IMPROVE on writing multiple ids with same values
        # we are going to create an new shape for each ids
        # lets hope gc will be effctive else we will have to do some
        # perfo improvement by using copy or weakref lib.
        context = context or {}
        wkt = None
        sql = 'UPDATE %s SET %s =' % (obj._table, name)
        mode = {
            'not_null': " ST_GeomFromText(%(wkt)s, %(srid)s) WHERE id=%(id)s",
            'null': ' NULL WHERE id=%(id)s'}
        if value:
            mode_to_use = 'not_null'
            if context.get('geo_direct_write'):
                wkt = value
            else:
                shape_to_write = self.entry_to_shape(value, same_type=True)
                if shape_to_write.is_empty:
                    mode_to_use = 'null'
                else:
                    wkt = shape_to_write.wkt
        else:
            mode_to_use = 'null'
        sql += mode[mode_to_use]
        exp_logger.debug(cr.mogrify(sql, {'wkt': wkt,
                                          'srid': self._srid,
                                          'id': res_id}))
        cr.execute(sql, {'wkt': wkt,
                         'srid': self._srid,
                         'id': res_id})
        return []

    def get(self, cr, obj, ids, name, uid=False, context=None, values=None):
        if context is None:
            context = {}
        if self._context:
            context = context.copy()
        context.update(self._context)
        if values is None:
            values = {}

        res = {}
        for read in obj.pool.get(obj._name)._read_flat(cr, uid, ids, [name],
                                                       context=context,
                                                       load='_classic_write'):
            if read[name]:
                res[read['id']] = geojson.dumps(read[name])
            else:
                res[read['id']] = False
        return res


# We may use monkey patching but we do not want to break normal function field
def postprocess(self, cr, uid, obj, field, value=None, context=None):
    if context is None:
        context = {}
    field_type = obj._columns[field]._type
    if field_type.startswith('geo_'):
        res = geojson.dumps(value)
    else:
        res = super(GeoFunction, self).postprocess(
            cr, uid, obj, field, value, context)
    return res


class GeoFunction(fields.function):
    # shell class
    pass

GeoFunction.postprocess = postprocess
fields.geo_function = GeoFunction


class GeoRelated(fields.related):
    # shell class
    pass
GeoRelated.postprocess = postprocess
fields.geo_related = GeoRelated
