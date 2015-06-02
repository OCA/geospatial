.. image:: https://img.shields.io/badge/licence-AGPL--3-blue.svg
    :alt: License

Auto Geocoding of partners
==========================

Automatically geocode addresses using
http://www.geonames.org/ API. We use this API because it is free and has
little data usage restriction.

The limitation is that address is localized by city not by street.
For more precize localisation you have to use a non free API. Google maps APi
limitation exclude the use of geocoded data in OpenERP.
You can contact Camptocamp if you need to create a specific geocoder or
acces geocoding services.

Technical notes:
We use postgis to do the reprojection in order to avoid gdal python deps.

Installation
============

Take a look at the installation section in the description of the module 
'base_geoengine'.

The `geoname <http://www.geonames.org/>`_ API requires a valid username.
The username must be specify in  the System Parameters under the key
'geoengine_geonames_username'.

Bug Tracker
===========

Bugs are tracked on `GitHub Issues <https://github.com/OCA/geospatial/issues>`_.
In case of trouble, please check there if your issue has already been reported.
If you spotted it first, help us smashing it by providing a detailed and welcomed feedback
`here <https://github.com/OCA/geospatial/issues/new?body=module:%20geoengine_geoname_geocoder%0Aversion:%208.0%0A%0A**Steps%20to%20reproduce**%0A-%20...%0A%0A**Current%20behavior**%0A%0A**Expected%20behavior**>`_.


Credits
=======

Contributors
------------

* Alexandre Fayolle <alexandre.fayolle@camptocamp.com>
* Bruno Binet <bruno.binet@camptocamp>
* Frédéric Junod <frederic.junod@camptocamp.com>
* Guewen Baconnier <guewen.baconnier@camptocamp.com>
* Jordi Riera <jordi.riera@savoirfairelinux.com>
* Laurent Mignon <laurent.mignon@acsone.eu>
* Nicolas Bessi <nicolas.bessi@camptocamp.com>
* Sandy Carter <sandy.carter@savoirfairelinux.com>

Maintainer
----------

.. image:: http://odoo-community.org/logo.png
   :alt: Odoo Community Association
   :target: http://odoo-community.org

This module is maintained by the OCA.

OCA, or the Odoo Community Association, is a nonprofit organization whose mission is to support the collaborative development of Odoo features and promote its widespread use.

To contribute to this module, please visit http://odoo-community.org.
