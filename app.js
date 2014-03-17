(function() {

    return {

        resources: { //Static links accessed by requests using string interpolation (ember helper string.fmt)
            TEXT_REDACTION_URI: '/api/v2/tickets/%@/comments/%@/redact.json',
            ATTACHMENT_REDACTION_URI: '/api/v2/tickets/%@/comments/%@/attachments/%@/redact.json',
            TIXCOMMENTS_URI: '/api/v2/tickets/%@/comments.json'
        },

        events: {
            'app.activated': 'redactMenu',
            'click .AttachLeave': 'redactMenu',
            'click .submit_text': 'getCommentsData',
            'click .confirm_text_redaction': 'getCommentsDataRedact',
            'click .attach_redact': 'getRestComments',
            'getAttachmentData.done': 'attachMenu',
            'getAttachmentData.fail': 'notifyRestFail',
            'getAllComments.done': 'matchString',
            'getAllComments.fail': 'notifyRestFail',
            'getConfirmedComments.done': 'performTextRedaction',
            'getConfirmedComments.fail': 'notifyRestFail',
            'doTextRedaction.done': 'notifySuccess',
            'doTextRedaction.fail': 'notifyFail',
            'click .AttachConfirm': 'confirmAttachment',
            'click .save_attach_redact': 'doAttachRedact',
            'doAttachmentRedaction.done': 'notifySuccess',
            'doAttachmentRedaction.fail': 'notifyFail'
        },

        requests: {

            doTextRedaction: function(data, ticket_id, comment_id) { //	REST API string redaction 
                return {
                    url: helpers.fmt(this.resources.TEXT_REDACTION_URI, ticket_id, comment_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(data)
                };
            },

            doAttachmentRedaction: function(ticket_id, comment_id, attachment_id) { //	REST API attachment redaction
                return {
                    url: helpers.fmt(this.resources.ATTACHMENT_REDACTION_URI, ticket_id, comment_id, attachment_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: '{"":""}'
                };
            },

            getAttachmentData: function(ticket_id) { //	ZAF Data API does not have a getter for attachment id's so unfortunately this request is necessary
                return {
                    url: helpers.fmt(this.resources.TIXCOMMENTS_URI, ticket_id),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            },

            getAllComments: function(ticket_id) { // Looks like the "Awesome" ticket.comments() object isn't so awesome and now returns html body rather than text body
                return {
                    url: helpers.fmt(this.resources.TIXCOMMENTS_URI, ticket_id),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };

            },

            getConfirmedComments: function(ticket_id) { // quick and dirty to make use of REST API after refactor...
                return {
                    url: helpers.fmt(this.resources.TIXCOMMENTS_URI, ticket_id),
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            }

        },

        redactMenu: function() { //	initially displays the text redaction template.
            this.switchTo('redact_text');
        },

        getRestComments: function() { //handler to get ticket comments - first step in creating attachment list - tickets with 100+ comments not supported yet. Needs pagination
            var ticket_id = this.ticket().id();
            this.ajax('getAttachmentData', ticket_id);
        },

        attachMenu: function(data) { //	Maps comments.json to provide an array of attachments and necessary data to redact and/or display them
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
            this.switchTo('redact_attach', { //	Fires off a function to take the attachment array and display a list of attachments available for redaction (minus redacted.txt files)
                attachments: attachments
            });
        },

        getCommentsData: function() {
            var ticket_id = this.ticket().id();
            this.ajax('getAllComments', ticket_id);
        },

        getCommentsDataRedact: function() {
            this.$('.text_redact').modal('hide');
            var ticket_id = this.ticket().id();
            this.ajax('getConfirmedComments', ticket_id);
        },



        matchString: function(data) { //	Uses Data API 'this.tickets().comments()' to retrieve comments, no worries inre: pagination as the result object isn't segmented.
            var user_string = this.$('.redaction_string')[0].value;
            var escaped_string = user_string.replace(/[\n]/g, "\\n"); //	Unescape newlines so redacting the string represents the string in the comment, literally.
            var all_comments = data.comments;
            var matched_comments = _.chain(all_comments)
                .filter(function(comment) {
                    return comment.body != null;
                })
                .filter(function(comment) { //	Creates a new object only including comments that contain the user's desired string
                    var string = comment.body;
                    return string.indexOf(escaped_string) > -1;
                })
                .value();
            var total_actions = matched_comments.length; // Used to display the total number of redaction actions in the confirmation modal.
            if (user_string !== "") { //	If the string to be redacted isn't blank, then display the confirmation modal
                this.$('.text_redact').modal({ //	Fires a modal to display the string that will be redacted and how many times it appears on the ticket.
                    backdrop: true,
                    keyboard: false,
                    body: this.$('.modal-body div.string_presenter').text(user_string),
                    total_actions: this.$('.modal-body span.num_actions').text(total_actions)
                });
            } else { //	If the form is submitted without any content, then let the customer know what they did.
                services.notify('Your redaction cannot be blank. Double check that you have pasted content into the text area.', 'error');
            }
        },

        performTextRedaction: function(data) { //	Fires when user confirms the string and number of redactions. 
            var user_string = this.$('.redaction_string')[0].value;
            var escaped_string = user_string.replace(/[\n]/g, "\\n"); //    Unescape newlines so redacting the string represents the string in the comment, literally.
            var all_comments = data.comments;
            var matched_comments = _.chain(all_comments)
                .filter(function(comment) {
                    return comment.body != null;
                })
                .filter(function(comment) { //  Creates a new object only including comments that contain the user's desired string
                    var string = comment.body;
                    return string.indexOf(escaped_string) > -1;
                })
                .value();
            var total_actions = matched_comments.length; //	This time, used to create the iterator for multiple redactions.
            var ticket_id = this.ticket().id();
            var text_data = {
                "text": escaped_string
            };
            console.log(matched_comments);
            for (var x = 0; x < total_actions; x++) {
                var comment_id = matched_comments[x].id;
                console.log(comment_id);
                this.ajax('doTextRedaction', text_data, ticket_id, comment_id); //	Fires the actual request to redact.json for text redactions
            }

        },


        getSelectedAttachments: function() { //	Handler for grabbing the janky input from the attachment list template. Each attachment object has five hidden inputs that need to be grouped.
            var inputData = this.$('ul#attachmentList li input').serializeArray();
            var selected_attachments = _.chain(inputData)
                .groupBy(function(data) {
                    return data.name;
                })
                .filter(function(data) {
                    return data.length > 5;
                })
                .map(function(attachment) {
                    return { //	This is mapped in the order that hidden elements appear in the checkbox list. If that order changes, then the related array key will need to change.
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

        confirmAttachment: function() { //	Fires off a modal to confirm the attachments selected for redaction. Image attachments will show thumbnails, generic icon for others
            var selected_attachments = this.getSelectedAttachments();

            var attachList = '';
            var count = selected_attachments.length;
            var generic_icon = this.assetURL('document_generic.png');
            for (var x = 0; x < count; x++) {
                if (selected_attachments[x].file_type.split("/")[0] == "image") { //	If the attachment is an image, show it.
                    attachList += '<li><img src=\"' + selected_attachments[x].url + '\" /> <span class=\"modal_filename\">' + selected_attachments[x].file + '</span></li>';
                } else { //	If the attachment is anything other than an image, show a generic file icon
                    attachList += '<li><img src=\"' + generic_icon + '\" /> <span class=\"modal_filename\">' + selected_attachments[x].file + '</span></li>';
                }
            }
            var presentedAttachments = '<p>You will be permanently removing the below files:</p><ul class=\"redaction_img_list\">' + attachList + '</ul>'; //	HTML to inject
            this.$('.attach_redact').modal({ //	The above funciton and iteration is a bit dirty. Can be cleaned up using something like 'var html = this.renderTemplate()'
                backdrop: true,
                keyboard: false,
                body: this.$('.modal-body div.attachPresenter').html(presentedAttachments)
            });
        },


        doAttachRedact: function() { //	Performs the attachment redaction if the user chose 'Yes' in the confirmation modal.
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

        notifySuccess: function() { //	Cannot refresh ticket data from app, user must refresh page.
            services.notify('Your redactions were successful. Refresh the page to update this ticket view.');
        },

        notifyFail: function() { //	Whoops?
            services.notify('One or more of the redactions failed...please try again', 'error');
        },

        notifyRestFail: function() { //	REST API Whoops?
            services.notify('There was a failure contacting the Zendesk REST API', 'error');
        }
    };

}());