(function() {

    return {

        resources: {
            TEXT_REDACTION_URI: '/api/v2/tickets/%@/comments/%@/redact.json',
            ATTACHMENT_REDACTION_URI: '/api/v2/tickets/%@/comments/%@/attachments/%@/redact.json',
            TIXCOMMENTS_URI: '/api/v2/tickets/%@/comments.json'
        },

        events: {
            'app.activated': 'redactMenu',
            'click .AttachLeave': 'redactMenu',
            'click .submit_text': 'matchString',
            'click .confirm_text_redaction': 'performTextRedaction',
            'click .attach_redact': 'getRestComments',
            'getAttachmentData.done': 'attachMenu',
            'getAttachmentData.fail': 'notifyRestFail',
            'doTextRedaction.done': 'notifySuccess',
            'doTextRedaction.fail': 'notifyFail',
            'click .AttachConfirm': 'confirmAttachment',
            'click .save_attach_redact': 'doAttachRedact',
            'doAttachmentRedaction.done': 'notifySuccess',
            'doAttachmentRedaction.fail': 'notifyFail'
        },

        requests: {

            doTextRedaction: function(data, ticket_id, comment_id) {
                return {
                    url: helpers.fmt(this.resources.TEXT_REDACTION_URI, ticket_id, comment_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(data) // '{"text": "value"}'
                };
            },

            doAttachmentRedaction: function(ticket_id, comment_id, attachment_id) {
                return {
                    url: helpers.fmt(this.resources.ATTACHMENT_REDACTION_URI, ticket_id, comment_id, attachment_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: '{"":""}'
                };
            },

            getAttachmentData: function(ticket_id) {
                return {
                    url: helpers.fmt(this.resources.TIXCOMMENTS_URI, ticket_id),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            }

        },

        redactMenu: function() {
            this.switchTo('redact_text');
        },

        getRestComments: function() {
            var ticket_id = this.ticket().id();
            this.ajax('getAttachmentData', ticket_id);
        },

        attachMenu: function(data) {
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
                .filter(function(attachment) {
                    return attachment.file !== "redacted.txt";
                })
                .value();
            var count = attachments.length;
            for (var x = 0; x < count; x++) {
                attachments[x].key = x;
            }
            this.switchTo('redact_attach', {
                attachments: attachments
            });
        },

        matchString: function() {
            var user_string = this.$('.redaction_string')[0].value;
            var escaped_string = user_string.replace(/[\n]/g, "\\n");
            var all_comments = this.ticket().comments();
            var matched_comments = _.chain(all_comments)
                .filter(function(comment) {
                    var string = comment.value();
                    return string.indexOf(escaped_string) > -1;
                })
                .value();
            var total_actions = matched_comments.length;
            if (user_string !== "") {
                this.$('.text_redact').modal({
                    backdrop: true,
                    keyboard: false,
                    body: this.$('.modal-body div.string_presenter').text(user_string),
                    total_actions: this.$('.modal-body span.num_actions').text(total_actions)
                });
            } else {
                services.notify('Your redaction cannot be blank. Double check that you have pasted content into the text area.', 'error');
            }
        },

        performTextRedaction: function(e) {
            this.$('.text_redact').modal('hide');
            var user_string = this.$('.redaction_string')[0].value;
            var escaped_string = user_string.replace(/[\n]/g, "\\n");
            var all_comments = this.ticket().comments();
            var matched_comments = _.chain(all_comments)
                .filter(function(comment) {
                    var string = comment.value();
                    return string.indexOf(escaped_string) > -1;
                })
                .value();
            var total_actions = matched_comments.length;
            var ticket_id = this.ticket().id();
            var data = {
                "text": escaped_string
            };
            for (var x = 0; x < total_actions; x++) {
                var comment_id = matched_comments[x].id();
                this.ajax('doTextRedaction', data, ticket_id, comment_id);
            }

        },


        getSelectedAttachments: function() {
            var inputData = this.$('ul#attachmentList li input').serializeArray();
            var selected_attachments = _.chain(inputData)
                .groupBy(function(data) {
                    return data.name;
                })
                .filter(function(data) {
                    return data.length > 5;
                })
                .map(function(attachment) {
                    return {
                        selected: attachment[0].value,
                        attachment_id: attachment[1].value,
                        url: attachment[2].value,
                        file: attachment[3].value,
                        comment_id: attachment[4].value,
                        file_type: attachment[5].value
                    };
                })
                .value();
            return selected_attachments;

        },

        confirmAttachment: function() {
            var selected_attachments = this.getSelectedAttachments();

            var attachList = '';
            var count = selected_attachments.length;
            var generic_icon = this.assetURL('document_generic.png');
            for (var x = 0; x < count; x++) {
                if (selected_attachments[x].file_type.split("/")[0] == "image") {
                    attachList += '<li><img src=\"' + selected_attachments[x].url + '\" /> <span class=\"modal_filename\">' + selected_attachments[x].file + '</span></li>';
                } else {
                    attachList += '<li><img src=\"' + generic_icon + '\" /> <span class=\"modal_filename\">' + selected_attachments[x].file + '</span></li>';
                }
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
                var comment_id = selected_attachments[x].comment_id;
                var attachment_id = selected_attachments[x].attachment_id;
                this.ajax('doAttachmentRedaction', ticket_id, comment_id, attachment_id);

            }

        },

        notifySuccess: function() {
            services.notify('Your redactions were successful. Refresh the page to update this ticket view.');
        },

        notifyFail: function() {
            services.notify('One or more of the redactions failed...please try again', 'error');
        },

        notifyRestFail: function() {
            services.notify('There was a failure contacting the Zendesk REST API', 'error');
        }
    };

}());