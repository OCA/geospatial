=================
Installation
=================

Once prerequisites are installed you still have to apply fixes pending to be merge in
Odoo Core before being able to use it: ::

    git pull origin pull/5620/head
    git cherry-pick 676e4b8d

This fix is already merged in the OCB (Odoo Community Backports) branch.
If you are using it there is no need to install the fix yourself.
