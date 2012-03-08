=================
Installation
=================


***************************
PostGIS database template
***************************

In order to create databases from the OpenERP client, you have to create a PostGis database template.
Under windows, this template is already available in installer.

On other *NIX, system you simply have to launch the create_postgis_template.sh script available in the base_geoengine module in the scripts folder.
This should be done by a PostgreSQL superuser.

In order to test the success::

 psql -l
 template_postgis | owner | UTF8 | en_US.UTF-8 | en_US.UTF-8 |


If you want to install GeoEngine on an exisiting database, please refer to the Postgisify section.

***************
OpenERP
***************

Add the template as an argument to OpenERP server::

 --db-template=template_postgis
 
or in config file::

 db_template = template_postgis
 

Do not forget to add the GeoEngine modules to your addons path.
 
Then install (eventually update module list) the base GeoEngine module form the OpenERP client.
