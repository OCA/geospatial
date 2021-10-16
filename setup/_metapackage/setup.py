import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo9-addons-oca-geospatial",
    description="Meta package for oca-geospatial Odoo addons",
    version=version,
    install_requires=[
        'odoo9-addon-base_geoengine',
        'odoo9-addon-base_geoengine_demo',
        'odoo9-addon-geoengine_maplausanne',
        'odoo9-addon-geoengine_partner',
        'odoo9-addon-geoengine_swisstopo',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
        'Framework :: Odoo :: 9.0',
    ]
)
