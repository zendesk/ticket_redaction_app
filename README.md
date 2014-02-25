:warning: *Use of this software is subject to important terms and conditions as set forth in the License file* :warning:
# Ticket Redaction App

## Description:

An app which uses the below endpoints (beta): 

* /api/v2/{{ticket_id}}/comments/{{comment_id}}/redact.json
* /api/v2/{{ticket_id}}/comments/{{comment_id}}/attachments/{{attachment_id}}/redact.json


The app is meant to provide a simple and clean gui interface for an admin to redact a string or attachment(s) from a ticket's comments. The user can copy/past a piece of text directly from a ticket into the app. The app will then confirm and perform the redaction. For attachment redaction, a list of the ticket's attachments is included in a list of checkboxes. The user choosed the attachments they wish to redact, are presented with a confirmation screen, then confirm or cancel the redaction.

## App location:

* Ticket sidebar

## Features:

* Redacts a specific string from ticket comments
* Redacts specific attachment(s) from ticket

## Set-up/installation instructions:

Simply install & activate the app then open a ticket. 

## Contribution:

Pull requests are welcome.

## Screenshot(s):

![](http://imgur.com/O9UOSGF)
![](http://imgur.com/y2XlR81)