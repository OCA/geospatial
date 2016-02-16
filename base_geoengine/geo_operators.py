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

UNION_MAPPING = {'|': 'OR', '&': 'AND'}

logger = logging.getLogger('geoengine.sql.debug')

# TODO Refactor geo_search and dry up the get_**_sql code


def _get_geo_func(model, domain):
    """Map operator to function we do not want to override __getattr__"""
    current_field = model._columns[domain[0]]
    current_operator = current_field._geo_operator
    attr = "get_%s_sql" % (domain[1],)
    if not hasattr(current_operator, attr):
        raise ValueError(
            'Field %s does not support %s' % (current_field, domain[1]))
    func = getattr(current_operator, attr)
    return func


def geo_search(model, cursor, uid, domain=None, geo_domain=None, offset=0,
               limit=None, order=None, context=None):
    """Perform a geo search it allows direct domain:
    geo_search(
        r, uid, domaine=[('name', 'ilike', 'toto']),
        geo_domain=[('the_point',
                     'geo_intersect',
                     myshaply_obj or mywkt or mygeojson)])

    We can also support indirect geo_domain
        (‘geom’, ‘geo_operator’, {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })

    The supported operators are :
     * geo_greater
     * geo_lesser
     * geo_equal
     * geo_touch
     * geo_within
     * geo_contains
     * geo_intersect
    """
    domain = domain or []
    geo_domain = geo_domain or []
    context = context or {}
    model.pool.get('ir.model.access').check(cursor, uid, model._name, 'read')
    query = model._where_calc(
        cursor, uid, domain, active_test=True, context=context)
    model._apply_ir_rules(cursor, uid, query, 'read', context=context)
    order_by = ''
    if order:
        order_by = model._generate_order_by(order, query) or ''
    from_clause, where_clause, where_clause_params = query.get_sql()
    limit_str = limit and ' LIMIT %d' % limit or ''
    offset_str = offset and ' OFFSET %d' % offset or ''
    where_clause_arr = []
    if where_clause and where_clause_params:
        where_clause_arr.append(where_clause)
    # geosearch where clause generation
    MODE = ''
    UNION = 'AND'
    JOIN_MODE = '%s %s'
    for domain in geo_domain:
        if isinstance(domain, basestring):
            if domain == '!':
                MODE = 'NOT'
            if domain in UNION_MAPPING.keys():
                UNION = UNION_MAPPING[domain]
        if where_clause_arr:
            where_clause_arr.append(JOIN_MODE % (MODE, UNION))
        # We start computing geo spation SQL
        if isinstance(domain, (list, tuple)):
            if isinstance(domain[2], dict):
                # We are having indirect geo_operator like (‘geom’, ‘geo_...’,
                # {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })
                ref_search = domain[2]
                rel_where_statement = []
                for key in ref_search:
                    i = key.rfind('.')
                    rel_model = key[0:i]
                    rel_col = key[i + 1:]
                    rel_model = model.pool.get(rel_model)
                    from_clause += ', %s' % (rel_model._table,)
                    att_where_sql = u''
                    # we compute the attributes search on spatial rel
                    if ref_search[key]:
                        rel_query = rel_model._where_calc(
                            cursor, uid, ref_search[key], active_test=True,
                            context=context)
                        rel_res = rel_query.get_sql()
                        att_where_sql = rel_res[1]
                        where_clause_params += rel_res[2]
                    # we compute the spatial search on spatial rel
                    func = _get_geo_func(model, domain)
                    spatial_where_sql = func(
                        model._table, domain[0], domain[2], rel_col=rel_col,
                        rel_model=rel_model)
                    if att_where_sql:
                        rel_where_statement.append(
                            u"(%s AND %s)" % (att_where_sql,
                                              spatial_where_sql))
                    else:
                        rel_where_statement.append(
                            u"(%s)" % (spatial_where_sql))
                where_clause_arr.append(u"AND ".join(rel_where_statement))
            else:
                func = _get_geo_func(model, domain)
                where_sql = func(model._table, domain[0], domain[2])
                where_clause_arr.append(where_sql)
    if where_clause_arr:
        where_statement = " WHERE %s" % (u' '.join(where_clause_arr))
    else:
        where_statement = u''
    sql = 'SELECT "%s".id FROM ' % model._table + from_clause + \
        where_statement + order_by + limit_str + offset_str
    # logger.debug(cursor.mogrify(sql, where_clause_params))
    cursor.execute(sql, where_clause_params)
    res = cursor.fetchall()
    if res:
        return [x[0] for x in res]
    else:
        return []


class GeoOperator(object):

    def __init__(self, geo_field):
        self.geo_field = geo_field

    def get_rel_field(self, rel_col, rel_model):
        """Retrieves the expression to use in PostGIS statement for a spatial
           rel search"""
        try:
            rel_model._columns[rel_col]
        except Exception:
            raise Exception(
                'Model %s has no column %s' % (rel_model._name, rel_col))
        return "%s.%s" % (rel_model._table, rel_col)

    def _get_direct_como_op_sql(self, table, col, value, rel_col=None,
                                rel_model=None, op=''):
        """provide raw sql for geater and lesser operators"""
        if isinstance(value, (int, long, float)):
            if rel_col and rel_model:
                raise Exception(
                    'Area %s does not support int compare for relation '
                    'search' % (op,))
            return " ST_Area(%s.%s) %s %s" % (table, col, op, value)
        else:
            if rel_col and rel_model:
                compare_to = self.get_rel_field(rel_col, rel_model)
            else:
                base = self.geo_field.entry_to_shape(value, same_type=False)
                compare_to = base.wkt
            return " ST_Area(%s.%s) %s ST_Area(ST_GeomFromText('%s'))" % (
                table, col, op, compare_to)

    def _get_postgis_comp_sql(self, table, col, value, rel_col=None,
                              rel_model=None, op=''):
        """return raw sql for all search based on St_**(a, b) posgis operator
        """
        if rel_col and rel_model:
            compare_to = self.get_rel_field(rel_col, rel_model)
        else:
            base = self.geo_field.entry_to_shape(value, same_type=False)
            srid = self.geo_field._srid
            compare_to = "ST_GeomFromText('%s',%s)" % (base.wkt, srid)
        return " %s(%s.%s, %s)" % (op, table, col, compare_to)

    def get_geo_greater_sql(self, table, col, value, rel_col=None,
                            rel_model=None):
        """Returns raw sql for geo_greater operator
        (used for area comparison)
        """
        return self._get_direct_como_op_sql(table, col, value,
                                            rel_col, rel_model, op='>')

    def get_geo_lesser_sql(self, table, col, value, rel_col=None,
                           rel_model=None):
        """Returns raw sql for geo_lesser operator
        (used for area comparison)"""
        return self._get_direct_como_op_sql(table, col, value,
                                            rel_col, rel_model, op='<')

    def get_geo_equal_sql(self, table, col, value, rel_col=None,
                          rel_model=None):
        """Returns raw sql for geo_equal operator
        (used for equality comparison)
        """
        if rel_col and rel_model:
            compare_to = self.get_rel_field(rel_col, rel_model)
        else:
            base = self.geo_field.entry_to_shape(value, same_type=False)
            compare_to = "ST_GeomFromText('%s')" % (base.wkt,)
        return " %s.%s = %s" % (table, col, compare_to)

    def get_geo_intersect_sql(self, table, col, value, rel_col=None,
                              rel_model=None):
        """Returns raw sql for geo_intersec operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value,
                                          rel_col, rel_model,
                                          op='ST_Intersects')

    def get_geo_touch_sql(self, table, col, value, rel_col=None,
                          rel_model=None):
        """Returns raw sql for geo_touch operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value,
                                          rel_col, rel_model,
                                          op='ST_Touches')

    def get_geo_within_sql(self, table, col, value, rel_col=None,
                           rel_model=None):
        """Returns raw sql for geo_within operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value,
                                          rel_col, rel_model,
                                          op='ST_Within')

    def get_geo_contains_sql(self, table, col, value, rel_col=None,
                             rel_model=None):
        """Returns raw sql for geo_contains operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value,
                                          rel_col, rel_model,
                                          op='ST_Contains')
