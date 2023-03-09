# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from .fields import GeoField
from .geo_operators import GeoOperator

UNION_MAPPING = {"|": "OR", "&": "AND"}


def _get_geo_func(model, domain):
    """Map operator to function we do not want to override __getattr__"""
    current_field = model._fields[domain[0]]
    if isinstance(current_field, GeoField):
        current_operator = GeoOperator(current_field)
        attr = "get_{}_sql".format(domain[1])
        if hasattr(current_operator, attr):
            return getattr(current_operator, attr)
    raise ValueError("Field {} does not support {}".format(current_field, domain[1]))


def geo_search(model, domain=None, geo_domain=None, offset=0, limit=None, order=None):
    """Deprecated! uses normal search method...
     Perform a geo search it allows direct domain:
    geo_search(
        domain=[('name', 'ilike', 'toto']),
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
    cr = model._cr
    domain = domain or []
    geo_domain = geo_domain or []
    model.env["ir.model.access"].check(model._name, "read")
    # _where_calc = Computes the WHERE clause needed to implement an OpenERP domain.
    # :param list domain: the domain to compute, active_test: whether the default
    # filtering of records with
    query = model._where_calc(domain, active_test=True)
    # Add what's missing in query to implement all appropriate ir.rules
    model._apply_ir_rules(query, "read")
    order_by = ""
    if order:
        order_by = model._generate_order_by(order, query) or ""
    from_clause, where_clause, where_clause_params = query.get_sql()
    limit_str = limit and " LIMIT %d" % limit or ""
    offset_str = offset and " OFFSET %d" % offset or ""
    where_clause_arr = []
    if where_clause and where_clause_params:
        where_clause_arr.append(where_clause)
    # geosearch where clause generation
    MODE = ""
    UNION = "AND"
    JOIN_MODE = "%s %s"
    for domain in geo_domain:
        if isinstance(domain, str):
            if domain == "!":
                MODE = "NOT"
            if domain in list(UNION_MAPPING.keys()):
                UNION = UNION_MAPPING[domain]
        if where_clause_arr:
            where_clause_arr.append(JOIN_MODE % (MODE, UNION))
        # We start computing geo spation SQL
        if isinstance(domain, (list, tuple)):
            if isinstance(domain[2], dict):  # si à droite c'est un dict
                # We are having indirect geo_operator like (‘geom’, ‘geo_...’,
                # {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })
                ref_search = domain[2]
                rel_where_statement = []
                for key in ref_search:
                    i = key.rfind(".")
                    rel_model = key[0:i]
                    rel_col = key[i + 1 :]
                    rel_model = model.env[rel_model]
                    from_clause += ", {}".format(rel_model._table)
                    att_where_sql = ""
                    # we compute the attributes search on spatial rel
                    if ref_search[key]:
                        rel_query = rel_model._where_calc(
                            ref_search[key], active_test=True
                        )
                        rel_res = rel_query.get_sql()
                        att_where_sql = rel_res[1]
                        where_clause_params += rel_res[2]
                    # we compute the spatial search on spatial rel
                    func = _get_geo_func(model, domain)
                    spatial_where_sql = func(
                        model._table,
                        domain[0],
                        domain[2],
                        rel_col=rel_col,
                        rel_model=rel_model,
                    )
                    if att_where_sql:
                        rel_where_statement.append(
                            "({} AND {})".format(att_where_sql, spatial_where_sql)
                        )
                    else:
                        rel_where_statement.append("(%s)" % (spatial_where_sql))
                where_clause_arr.append("AND ".join(rel_where_statement))
            else:
                func = _get_geo_func(model, domain)
                where_sql = func(model._table, domain[0], domain[2])
                where_clause_arr.append(where_sql)
    if where_clause_arr:
        where_statement = " WHERE %s" % (" ".join(where_clause_arr))
    else:
        where_statement = ""
    # pylint: disable=E8103
    sql = (
        'SELECT "%s".id FROM ' % model._table
        + from_clause
        + where_statement
        + order_by
        + limit_str
        + offset_str
    )
    # logger.debug(cursor.mogrify(sql, where_clause_params))
    cr.execute(sql, where_clause_params)
    res = cr.fetchall()
    if res:
        return [x[0] for x in res]
    else:
        return []
