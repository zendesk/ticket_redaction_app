:warning: *Use of this software is subject to important terms and conditions as set forth in the License file* :warning:

# Ticket Redaction App

## Description:

An app which uses the below endpoints:

* /api/v2/{{ticket_id}}/comments/{{comment_id}}/redact.json
* /api/v2/{{ticket_id}}/comments/{{comment_id}}/attachments/{{attachment_id}}/redact.json

The app is designed to create a simple and usable interface for Zendesk agents and administrators to easily redact strings of text or attachments from a ticket. The intended use is to redact sensitive data, such as ID numbers, credit cards, passwords, etc... A user can copy/paste the chosen text directly from a ticket into the app and it will confirm, then perform the redaction. Attachments are redacted by selecting from a list the desired attachments, then confirming the redaction in a modal window.

## App location:

* Ticket sidebar

## Features:

* Redacts a specific string from ticket comments
* Redacts the specific attachment(s) from a ticket

## Set-up/installation instructions:

Install and activate the app, then open a ticket.

## Contribution:

Pull requests are welcome.

## Screenshot(s):

![](http://cl.ly/U7Wl/tra_01.png)
![](http://cl.ly/U6ex/tra_02.png)
