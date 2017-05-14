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

![](https://cl.ly/2b2z0O0X130u/Screen%20Shot%202017-05-13%20at%207.00.40%20PM.png)
![](https://cl.ly/3R0o261G0B25/Screen%20Shot%202017-05-14%20at%207.03.57%20AM.png)
![](https://cl.ly/430l1C0S2D1M/Screen%20Shot%202017-05-14%20at%207.04.42%20AM.png)
![](https://cl.ly/2q261t3U410H/Screen%20Shot%202017-05-14%20at%207.06.03%20AM.png)
![](https://cl.ly/3E2k3k3M173X/Screen%20Shot%202017-05-14%20at%207.06.37%20AM.png)
