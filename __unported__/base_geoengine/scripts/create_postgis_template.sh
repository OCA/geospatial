# Set postgis-1.5 path.
POSTGIS_SQL_PATH=`pg_config --sharedir`/contrib/postgis-1.5

# Creating the template spatial database
createdb -E UTF8 -T template0 template_postgis
# and add PLPGSQL language support.
createlang -d template_postgis plpgsql

# Loading the PostGIS SQL routines.
psql -d template_postgis -f $POSTGIS_SQL_PATH/postgis.sql
psql -d template_postgis -f $POSTGIS_SQL_PATH/spatial_ref_sys.sql

# Enabling users to alter spatial tables.
psql -d template_postgis -c "GRANT ALL ON geometry_columns TO PUBLIC;"
psql -d template_postgis -c "GRANT ALL ON geography_columns TO PUBLIC;"
psql -d template_postgis -c "GRANT ALL ON spatial_ref_sys TO PUBLIC;"

# Garbage-collect and freeze.
psql -d template_postgis -c "VACUUM FULL;"
psql -d template_postgis -c "VACUUM FREEZE;"

# Allows non-superusers the ability to create from this template.
psql -d postgres -c "UPDATE pg_database SET datistemplate='true' WHERE datname='template_postgis';"
psql -d postgres -c "UPDATE pg_database SET datallowconn='false' WHERE datname='template_postgis';"