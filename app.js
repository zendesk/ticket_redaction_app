(function() {

    return {

        resources: {
            REDACTION_URI: '/api/v2/tickets/%@/comments/%@/redact.json',
            ATTACHMENT_REDACTION_URI: '/api/v2/tickets/%@/comments/%@/attachments/%@/redact.json',
            TIXCOMMENTS_URI: '/api/v2/tickets/%@/comments.json'
        },

        events: {
            'app.activated': 'showEntryForm',
            'click .submitRedaction': 'confirmString',
            'click .attachRedact': 'getAttachmentArray',
            'click .save_string_redact': 'doRedact',
            'click .AttachLeave': 'showEntryForm',
            'click .AttachConfirm': 'confirmAttachment',
            'click .save_attach_redact': 'doAttachRedact',
            'getTicketComments.done': 'matchResults',
            'putRedactionString.done': 'notifyRedaction',
            'putRedactionString.fail': 'notifyFail',
            'getAttachmentData.done': 'attachmentsTemplate',
            'putRedactionAttachment.done': 'notifyRedaction',
            'putRedactionAttachment.fail': 'notifyFail'
        }, //end events


        requests: {
            getTicketComments: function(ticketId) {
                return {
                    url: helpers.fmt(this.resources.TIXCOMMENTS_URI, ticketId),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            },
            getAttachmentData: function(ticketId) {
                return {
                    url: helpers.fmt(this.resources.TIXCOMMENTS_URI, ticketId),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            },
            putRedactionString: function(data, ticketId, c_id) {
                return {
                    url: helpers.fmt(this.resources.REDACTION_URI, ticketId, c_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(data) // '{"text": "value"}'
                };
            },
            putRedactionAttachment: function(ticketId, c_id, attachment_id) {
                return {
                    url: helpers.fmt(this.resources.ATTACHMENT_REDACTION_URI, ticketId, c_id, attachment_id),
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
        attachmentsTemplate: function(data) {


            var attachments = _.chain(data.comments)
                .filter(function(comment) {
                    return comment.attachments.length > 0;
                })
                .map(function(comment) {
                    return {
                        attachment_array: _.map(comment.attachments, function(attachment) {
                            return {
                                comment_id: comment.id,
                                attachment_id: attachment.id,
                                type: attachment.content_type,
                                url: attachment.content_url,
                                file: attachment.file_name
                            };
                        })
                    };
                })
                .map(function(comment) {
                    return comment.attachment_array;
                })
                .flatten(true)
                .value();
            var count = attachments.length;
            for (var x = 0; x < count; x++) {
                attachments[x].key = x;
            }
            this.switchTo('attachmentsForm', {
                attachments: attachments
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
            }

            this.executeRedaction(commentID, escapedString);
        },

        getSelectedAttachments: function() {
            var inputData = this.$('ul#attachmentList li input').serializeArray();
            var selected_attachments = _.chain(inputData)
                .groupBy(function(data) {
                    return data.name;
                })
                .filter(function(data) {
                    return data.length > 4;
                })
                .map(function(attachment) {
                    return {
                        selected: attachment[0].value,
                        attachment_id: attachment[1].value,
                        url: attachment[2].value,
                        file: attachment[3].value,
                        comment_id: attachment[4].value
                    };
                })
                .value();
            return selected_attachments;
        },

        confirmAttachment: function() {
            var selected_attachments = this.getSelectedAttachments();
            var attachList = '';
            var count = selected_attachments.length;
            for (var x = 0; x < count; x++) {
                attachList += '<li><img src=\"' + selected_attachments[x].url + '\" /> <span class=\"modal_filename\">' + selected_attachments[x].file + '</span></li>';
            }
            var presentedAttachments = '<p>You will be permanently removing the below files:</p><ul class=\"redaction_img_list\">' + attachList + '</ul>';
            this.$('.attach_redact').modal({
                backdrop: true,
                keyboard: false,
                body: this.$('.modal-body div.attachPresenter').html(presentedAttachments)
            });
        },

        doAttachRedact: function() {
            this.$('.attach_redact').modal('hide');
            var selected_attachments = this.getSelectedAttachments();
            var count = selected_attachments.length;
            var ticket_id = this.ticket().id();
            for (var x = 0; x < count; x++) {
                var c_id = selected_attachments[x].comment_id;
                var a_id = selected_attachments[x].attachment_id;
                this.ajax('putRedactionAttachment', ticket_id, c_id, a_id);

            }

        },


        executeRedaction: function(commentID, escapedString) {
            var counted = _.size(commentID);
            var ticket_id = this.ticket().id();
            var data = {
                "text": escapedString
            };
            for (var x = 0; x < counted; x++) {
                var c_id = commentID[x];
                this.ajax('putRedactionString', data, ticket_id, c_id);
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