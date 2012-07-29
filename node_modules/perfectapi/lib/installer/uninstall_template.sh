#!/bin/bash

# substitutions that should occur before running:
# 
#   amigen - name of service
# 

stop amigen
rm /usr/local/bin/perfectapi-amigen
rm /etc/init/amigen.conf

# and that, my friends is the laziest uninstall you'll ever see