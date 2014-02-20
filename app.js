(function() {

    var REDACTION_URI = '/api/v2/tickets/%@/comments/%@/redact.json',
    ATTACHMENT_REDACTION_URI = 'api/v2/tickets/%a/comments/%@/attachments/%@/redact.json',
        TIXCOMMENTS_URI = '/api/v2/tickets/%@/comments.json';

    return {

        events: {
            'app.activated': 'showEntryForm',
            'click .submitRedaction': 'confirmString',
            'click .attachRedact': 'getAttachmentArray',
            'click .save_button': 'doRedact',
            'getTicketComments.done': 'matchResults',
            'putRedactionString.done': 'notifyRedaction',
            'putRedactionString.fail': 'notifyFail',
            'getAttachmentData.done': 'attachmentModal'
        }, //end events


        requests: {
            getTicketComments: function(ticketId) {
                return {
                    url: helpers.fmt(TIXCOMMENTS_URI, ticketId),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            },
            getAttachmentData: function(ticketId) {
                return {
                    url: helpers.fmt(TIXCOMMENTS_URI, ticketId),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            },
            putRedactionString: function(data, ticketId, c_id) {
                return {
                    url: helpers.fmt(REDACTION_URI, ticketId, c_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(data) // '{"text": "value"}'
                };
            },
            putRedactionAttachment: function(ticketId, c_id, attachment_id) {
                return {
                    url: helpers.fmt(ATTACHMENT_REDACTION_URI, ticketId, c_id, attachment_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: '{"":""}'
                };
            }
        }, //end requests

        showEntryForm: function() {
            this.switchTo('redaction_form');
        },

        confirmString: function() {
            var searchString = this.$('.redactionString')[0].value;
            this.$('.text_redact').modal({
                backdrop: true,
                keyboard: false,
                body: this.$('.modal-body div.stringPresenter').text(searchString)
            });
        },

        getAttachmentArray: function() {
            var ticketId = this.ticket().id();
            this.ajax('getAttachmentData', ticketId);
        },

        //Will need to add logic to populate modal with attachments on this ticket...
        attachmentModal: function(data) {
            var asdf = data;
            console.log(asdf);
            var attachments = _.filter(asdf.comments, function(comment) {
                return comment.attachments.length > 0;
            });
            console.log(attachments);
            this.$('.attachment_modal').modal({
                backdrop: true,
                keyboard: false,
                attachment_body: this.$('.modal-body div.attachPresenter').text(asdf)
            });
        },

        doRedact: function() {
            this.$('.text_redact').modal('hide');
            var ticketId = this.ticket().id();
            this.ajax('getTicketComments', ticketId);
        },

        matchResults: function(data) {
            var searchString = this.$('.redactionString')[0].value;
            var escapedString = searchString.replace(/[\n]/g, "\\n");
            var ticketComments = data.comments;
            var count = data.count;
            var commentID = [];
            for (var x = 0; x < count; x++) {
                var commentBody = data.comments[x].body;
                if (commentBody.indexOf(escapedString) > -1) {
                    var matchingID = data.comments[x].id;
                    commentID.push(matchingID);
                }
                //else { //this isn't working correctly
                //  services.notify("there was an error matching the target string. Please notify the [developer](mailto:dpawluk@zendesk.com).", 'error');
                //}
            }

            this.executeRedaction(commentID, escapedString);
        },

        executeRedaction: function(commentID, escapedString) {
            var counted = _.size(commentID);
            var ticketId = this.ticket().id();
            var data = {
                "text": escapedString
            };
            for (var x = 0; x < counted; x++) {
                var c_id = commentID[x];
                this.ajax('putRedactionString', data, ticketId, c_id);
            }
        },

        notifyRedaction: function() {
            services.notify('Your redactions were successful. Refresh the page to update this ticket view.');
        },

        notifyFail: function() {
            services.notify('One or more of the redactions failed. I guess there\'s more work to do yet...', 'error');
        }
    };

}());