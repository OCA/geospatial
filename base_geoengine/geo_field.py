# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
import json
import pprint
import logging

from shapely.wkb import dumps as wkbdumps, loads as  wkbloads
from shapely.wkt import dumps as wktdumps, loads as  wktloads
from shapely.geometry import asShape
import geojson

from osv import fields, osv, orm
from tools.translate import _
import pooler
from geo_helper import geo_convertion_helper as convert

logger = logging.getLogger('GeoEngine database structure')
exp_logger = logging.getLogger('GeoEngine expression')

class Geom(fields._column):
    """This class add a new type of columns to ORM it enable POSTGIS geometry type support"""


    def load_geo(self, wkb):
        """This function is used to load geo into browse record
            after read was done"""
        return wkb and wkbloads(wkb.decode('hex')) or False


    def set_geo(self, value):
        """This function is use to transform data in order to be
            compatible with the create function, it is also use in expression.py
            in order to represent value it wont be use a we are not going to use it.
            As this function does not received contect direct create will not work"""
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
    #Due to the conception of the orm we have to set symbol set as an instance variable
    # instead of a class variable
    #_symbol_set = (' ST_GeomFromText(%s)', set_geo)
    _symbol_get = load_geo
    _fnct_inv = True


    def __init__(self, string, geo_type, dim=2, srid=900913 , gist_index=True, **args):
        fields._column.__init__(self, string, **args)
        #geometry type of postgis point, multipolygon, etc...
        self._geo_type = geo_type
        #2d, 3d, 4d, given by an int
        self._dim = dim
        #EPSG projection id
        self._srid = srid
        self._gist_index = gist_index
        self._symbol_set  = (u' ST_GeomFromText(%s,'+unicode(self._srid)+')', self.set_geo)


    def entry_to_shape(self, value, same_type=False):
        """Transform input into an object"""
        shape_to_return = convert.value_to_shape(value)
        if shape_to_return.is_empty:
            return shape_to_return
        if same_type:
            if shape_to_return.geom_type.lower() != self._geo_type.lower():
                raise Exception(_('Geo Value %s must be of the same'
                    'type %s as fields') % (shape_to_return.geom_type.lower(), self._geo_type.lower()))
        return shape_to_return

    def _create_index(self, cursor, table, col_name):
        if self._gist_index:
            try :
                cursor.execute("CREATE INDEX %s ON %s USING GIST ( %s )" %
                               (table + '_' + col_name + '_gist_index',
                                table,
                                col_name))
            except Exception, exc:
                cursor.rollback()
                logger.error('Can not create gist index for col %s table %s:'
                             ' error:%s' %(col_name, table, exc))
            finally:
                cursor.commit()

    def manage_db_column(self, cursor, col_name, geo_columns, table, model):
        """In charge of managing geom column type"""
        # we check if columns exists
        print cursor.mogrify("SELECT id from ir_model_fields where model = %s"
                       " and name = %s",
                       (model, col_name))
        cursor.execute("SELECT id from ir_model_fields where model = %s"
                       " and name = %s",
                       (model, col_name))
        field_exist = cursor.fetchone()
        if field_exist:
            self.update_geo_column(cursor, col_name, geo_columns, table, model)
        else:
            self.create_geo_column(cursor, col_name, geo_columns, table, model)
        return True


    def create_geo_column(self, cursor, col_name, geo_column, table, model):
        """Create a columns of type the geom"""
        try :
            cursor.execute("SELECT AddGeometryColumn( %s, %s, %s, %s, %s)",
                           (table,
                            col_name,
                            geo_column._srid,
                            geo_column._geo_type,
                            geo_column._dim))
            self._create_index(cursor, table, col_name)
        except Exception, exc:
            cursor.rollback()
            logger.error('Can not create column %s table %s:'
                         ' error:%s' %(col_name, table, exc))
        finally:
            cursor.commit()

        return True

    def update_geo_column(self, cursor, col_name, geo_column, table, model):
        """Update a columns of type the geom does not do a lot of stuff yet"""
        print cursor.mogrify("SELECT srid, type, coord_dimension FROM geometry_columns WHERE f_table_name = %s"
                       " AND f_geometry_column = %s",
                       (table, col_name))
        cursor.execute("SELECT srid, type, coord_dimension FROM geometry_columns WHERE f_table_name = %s"
                       " AND f_geometry_column = %s",
                       (table, col_name))
        check_data = cursor.fetchone()
        if not check_data :
            raise Exception("geometry_columns table seems to be corrupted. SRID check is not possible")
        if check_data[0] != geo_column._srid:
            raise Exception("Reprojection of column is not implemented"
                            "We can not change srid %s to %s" % (geo_column._srid, check_data[0]))
        if check_data[1] != geo_column._geo_type:
            raise Exception("Geo type modification is not implemented"
                            "We can not change type %s to %s" % (check_data[1], geo_column._type))
        if check_data[2] != geo_column._dim:
            raise Exception("Geo dimention modification is not implemented"
                            "We can not change dimention %s to %s" % (check_data[2], geo_column._dim))
        if self._gist_index:
            cursor.execute("SELECT indexname FROM pg_indexes WHERE indexname = %s",
                           (table + '_' + col_name + '_gist_index',))
            index = cursor.fetchone()
            if cursor:
                return True
            self._create_index(cursor, table, col_name)
        return True


    def set(self, cr, obj, res_id, name, value, user=None, context=None):
        """ Function use to write and create value into database
            value can be geojson, wkt, shapely geomerty object
            if geo_direct_write in context you can pass diretly WKT"""
        # TO IMPROVE on writing multiple ids with same values
        # we are going to create an new shape for each ids
        # lets hope gc will be effctive else we will have to do some
        # perfo improvment by using copy or weakref lib.
        context = context or {}
        wkt = None
        sql = 'update %s set %s =' % (obj._table, name)
        mode = {'not_null':" ST_GeomFromText(%(wkt)s, %(srid)s) where id=%(id)s",
                'null': ' NULL where id=%(id)s'}
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
        for read in obj.pool.get(obj._name)._read_flat(cr, uid, ids, [name], context=context, load='_classic_write'):
            if read[name]:
                res[read['id']] = geojson.dumps(read[name])
            else:
                res[read['id']] = False
        return res
