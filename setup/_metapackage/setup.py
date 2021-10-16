import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo13-addons-oca-geospatial",
    description="Meta package for oca-geospatial Odoo addons",
    version=version,
    install_requires=[
        'odoo13-addon-base_geoengine',
        'odoo13-addon-geoengine_base_geolocalize',
        'odoo13-addon-geoengine_partner',
        'odoo13-addon-geoengine_swisstopo',
        'odoo13-addon-test_base_geoengine',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
        'Framework :: Odoo :: 13.0',
    ]
)
