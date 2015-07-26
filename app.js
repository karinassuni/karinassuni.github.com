var app = angular.module('courser', []);
app.controller('courseListCtrl', function($scope, courseListing, timeCalc) {
    $scope.loading = true;
    courseListing.getAllCourses().success(function(response) {
        $scope.courses = response.courses;
    }).finally(function() {
        $scope.loading = false;
        $scope.allLimitMax = $scope.courses.length;
    })

    $scope.departments = ["All","Anthropology", "Art", "Bio Engin Small Scale Tech", "Biological Sciences", "Bioengineering", "Chicano Chicana Studies", "Chemistry", "Chinese", "Cognitive Science", "Core", "Community Research and Service", "Computer Science & Engineering", "Economics", "Elect. Engr. & Comp. Sci.", "English", "Engineering", "Environmental Engineering", "Environmental Systems (GR)", "Earth Systems Science", "French", "Global Arts Studies Program", "History", "Interdisciplinary Humanities", "Japanese", "Mathematics", "Mechanical Engineering", "Management", "Materials Science & Engr", "Natural Sciences Education", "Nat Sciences Undergrad Studies", "Public Health", "Philosophy", "Physics", "Political Science", "Psychology", "Quantitative & Systems Biology", "Social Sciences", "Sociology", "Spanish", "Undergraduate Studies", "World Heritage", "Writing"];
    $scope.colorScheme = {
        eng: ["Bio Engin Small Scale Tech","Bioengineering","Computer Science & Engineering","Elect. Engr. & Comp. Sci.","Engineering","Environmental Engineering","Mechanical Engineering","Materials Science and Engr","Physics"], //red
        natsci: ["Biological Sciences","Chemistry","Environmental Systems (GR)","Earth Systems Science","Nat Sciences Undergrad Studies","Quantitative & Systems Biology", "Mathematics"], //yelow
        ssha: ["Anthropology","Art","Chicano Chicana Studies","Chinese","Cognitive Science","Core","Community Research and Service","Economics","English","French","Global Arts Studies Program","History","Interdisciplinary Humanities","Japanese","Management","Natural Sciences Education","Public Health"," Philosophy","Political Science","Psychology","Social Sciences","Sociology","Spanish","Undergraduate Studies","World Heritage","Writing"], //blue
    };

    function adjustStyle(width) {
      width = parseInt(width);
      if (width < 701) {
        $("#size-stylesheet").attr("href", "phone.css");
        $('#mon').contents().last()[0].textContent='M';
        $('#tues').contents().last()[0].textContent='T';
        $('#wed').contents().last()[0].textContent='W';
        $('#thur').contents().last()[0].textContent='R';
        $('#fri').contents().last()[0].textContent='F';

      } else {
        $("#size-stylesheet2").attr("href", "style.css"); 
        $('#mon').contents().last()[0].textContent='Monday';
        $('#tues').contents().last()[0].textContent='Tuesday';
        $('#wed').contents().last()[0].textContent='Wednesday';
        $('#thur').contents().last()[0].textContent='Thursday';
        $('#fri').contents().last()[0].textContent='Friday';
      }
    }

    $(function() {
      adjustStyle($(this).width());
      $(window).resize(function() {
        adjustStyle($(this).width());
      });
    });


    
    if(localStorage.crns === undefined)
        localStorage.crns = ''
    $('#coursedump').val(localStorage.getItem("crns").trim());

    $scope.clearing = false;

    $scope.clear = function() {
        var beforestate = angular.copy($scope.scheduledCourses); //***
        $scope.actions.push({
            type: 'clear',
            sc: beforestate
        });

        $scope.clearing = true;
        while($scope.scheduledCourses.length > 0) {
            $scope.scheduledCourses.forEach(function(course) {
                $scope.unschedule(course.CRN);
            });
        }
        $scope.clearing = false;
    }

    $scope.undoing = false;
    $scope.undo = function(opts) {
        if($scope.actions[$scope.actions.length-1]['type'] == 'add') {
            $scope.undoing = true;
            $scope.unschedule($scope.actions[$scope.actions.length-1]['sc'].CRN);
            $scope.actions.splice(-1,1);
            $scope.undoing = false;
        }

        else if($scope.actions[$scope.actions.length-1]['type'] == 'remove') {
            $scope.undoing = true;
            $scope.schedule($scope.actions[$scope.actions.length-1]['sc']);
            $scope.actions.splice(-1,1);
            $scope.undoing = false;
        }

        else if($scope.actions[$scope.actions.length-1]['type'] == 'Add all') {
            $scope.undoing = true;
            for(crn in $scope.actions[$scope.actions.length-1]['sc']) {
                $scope.unschedule($scope.actions[$scope.actions.length-1]['sc'][crn]);
            }
            $scope.actions.splice(-1,1);
        }

        else if($scope.actions[$scope.actions.length-1]['type'] == 'clear'){
            $scope.undoing = true;
            for(course in $scope.actions[$scope.actions.length-1]['sc']) {
                //$scope.schedule($scope.actions[$scope.actions.length-1]['sc'][course]); BAD BECAUSE CAUSES SOME COURSES TO OVERLAP; DO THIS INSTEAD:
                $scope.schedule($scope.findCourse($scope.actions[$scope.actions.length-1]['sc'][course].CRN, $scope.courses)[0])
            }
            $scope.actions.splice(-1,1);
            $scope.undoing = false;
        }
        //remove duplicate actions, which tend to show up with 'remove' for some reason
        var count = 0;
        var i = 0;
        for(action in $scope.actions) {
            if(JSON.stringify($scope.actions[action]) === JSON.stringify($scope.actions[action])) {
                count++;
                i = action;
            }
        }
        if(count>1)
            $scope.actions.splice(i, 1);
            
    }

    $scope.undoHover = function(opts) {
        if($scope.actions[$scope.actions.length-1]['type'] == 'add') {
            $scope.actions[$scope.actions.length-1]['sc'];
        }

        else if($scope.actions[$scope.actions.length-1]['type'] == 'remove') {
            $scope.schedule($scope.actions[$scope.actions.length-1]['sc']);
        }

        else if($scope.actions[$scope.actions.length-1]['type'] == 'Add all') {
            for(crn in $scope.actions[$scope.actions.length-1]['sc']) {
                $scope.unschedule($scope.actions[$scope.actions.length-1]['sc'][crn]);
            }
        }

        else if($scope.actions[$scope.actions.length-1]['type'] == 'clear'){
            for(course in $scope.actions[$scope.actions.length-1]['sc']) {
                $scope.schedule($scope.actions[$scope.actions.length-1]['sc'][course]);
            }
        }
    }
    
    $scope.actions = [];
    $scope.scheduledCourses = [];
    $scope.overlaps = [];
    $scope.dupes = 0;
    $scope.parsing = false;
     
    $scope.dupeWorker = function(CRN) {
        for(var i=1; i<$scope.dupes; i++) {
            var course = $scope.findCourse(CRN, $scope.courses)[i]
            if(course.actv != "EXAM")
                $scope.schedule(course);
        }
        $scope.dupes = 0;
    }
    
    $scope.parseDump = function() {
        
            $scope.$watch(function() { return $scope.loading; },
            function() {
                if(!$scope.loading)
                    parse();
            });
        
        
        function parse() {

            $scope.parsing = true;

            var str = $("#coursedump").val();
            var re = /(\d{5})/g;
            var m; //= an array
            
            while((m = re.exec(str)) !== null) {
                if(m.index === re.lastIndex) {
                    re.lastIndex++;
                }
                $scope.schedule($scope.findCourse(m[1], $scope.courses)[0]);
            }
            $scope.parsing = false;

            $scope.actions.push({
                type: ' ',
                sc: {}
            });

            
            if($scope.scheduledCourses.length > 0)
                $("#coursedump").val(localStorage.crns.trim());
        }
    }
    
    $scope.findCourse = function(CRN, arr) {
        arrs = [];
        for(i in arr) {
            if(CRN == arr[i].CRN)
                arrs.push(arr[i]);
        }
        return arrs;
    };
    

    $scope.masterOverlap = [[],[],[],[],[]]; 
    // $scope.masterOverlap[0] == classesToday [{obj: courseobj, startTime: ts, endTime: te}]
      //each obj corresponds to one day of the week 's class_
      //has to store every scheduled course JIC it gets an overlap
    $scope.scheduleMaster = function(courseobj) {

        arr = timeCalc.main(courseobj, 2);
        
        //Convert to military time:
        ts = arr[0]*100 + arr[1];
        if(arr[2] == 'p' && arr[0] != 12) ts+= 1200;
        te = arr[3]*100 + arr[4];
        if(arr[5] == 'p' && arr[3] != 12) te+= 1200;

        if(!$scope.scheduledCourses.length) { //if == 0 
            //push a class into masterOverlap for each class on each day
            for(var day=0; day<courseobj.days.length; day++){
                //var dayOfClass = courseobj.days.charAt(day);
                var dayIndex;
                switch(courseobj.days.charAt(day)) {
                    case 'M': dayIndex = 0; break;
                    case 'T': dayIndex = 1; break;
                    case 'W': dayIndex = 2; break;
                    case 'R': dayIndex = 3; break;
                    case 'F': dayIndex = 4; break;
                }

                //if a day of a course doesn't have the same start time, it has its own courseobj so don't worry about start and end Times
                //NOTE: each classObj will have its own array just in case there'll be overlapping class_
                $scope.masterOverlap[dayIndex].push([{
                    obj: courseobj,
                    startTime: ts,
                    endTime: te
                }]);
            }
            return;
            //you now have:
            //$scope.masterOverlap = [[[{obj: samecourseobj, startTime: ts, endTime: te}]], [], [[{obj: samecourseobj, startTime: ts, endTime: te}]], [], []]
        }

        //when masterOverlap.length >= 1
        //almost a 2D array: iterate through every masterOverlap's days' own array groups (which will represent overlapping groups that're being added right now)
        for(var day=0; day<5; day++) {
            for(var classGroup=0; classGroup<$scope.masterOverlap[day].length; /*iterate over array classGroup*/ classGroup++) {
                for(var class_=0; class_<$scope.masterOverlap[day][classGroup].length; class_++) {
                    //^iterate over courseGroups that're usually of length==1 but possibly more if overlap found
                    //classGroup = 0 (the first class)
                    //$scope.masterOverlap[day] == [[{class_ object}],[{}],...] == classesToday
                    //$scope.masterOverlap[day][classGroup] == [{class_ object}] == classGroup
                    //$scope.masterOverlap[day][classGroup][class_] == {class_ object}
                    //compare if courseobj overlaps with any member so that the courseobj can be added to the array encapsulating the class (the class_ which are usually of length==1) which are within the classGroup array which is within masterOverlap's array of days
                    var otherClass = $scope.masterOverlap[day][classGroup][class_];

                    var daysSmaller;
                    var daysBigger;
                    if(courseobj.days.length > otherClass['obj'].days.length) {
                        daysSmaller = otherClass['obj'].days;
                        daysBigger = courseobj.days;
                    }
                    else {
                        daysSmaller = courseobj.days;
                        daysBigger = otherClass['obj'].days;
                    }
                    var overlappingDays = []; //days at which courseobj and class_ overlap

                    var t2s = otherClass['startTime']
                    var t2e = otherClass['endTime']

                    for(var i=0; i<daysSmaller.length; i++) {
                        if(daysBigger.indexOf(daysSmaller.charAt(i)) > -1) {
                            if(ts <= t2e && t2s <= te){
                                overlappingDays.push(daysSmaller.charAt(i).toLowerCase());
                            }
                        }
                    }
                    //overlappingDays.length == 0 if no overlap
                    //if there are no overlapping days; different operation of adding NEW entry into classesToday: classesToday: [[{obj_oldwithoutoverlap}],[{obj_newwithoutoverlap}]]
                    if(overlappingDays.length == 0) {
                        var dayIndex;
                        for(var i=0; i<courseobj.days.length; i++) {
                            switch(courseobj.days.charAt(i)) {
                                case 'M': dayIndex = 0; break;
                                case 'T': dayIndex = 1; break;
                                case 'W': dayIndex = 2; break;
                                case 'R': dayIndex = 3; break;
                                case 'F': dayIndex = 4; break;
                            }
                        }
                        if(dayIndex == day) { //insert if courseobj actually falls on this day
                            $scope.masterOverlap[day].push({
                                obj: courseobj,
                                startTime: ts,
                                endTime: te
                            });
                        }
                    }

                    var overlappingDayIndex;
                    for(var i=0; i<overlappingDays.length; i++) { //<= ensures a class_ always added
                        switch(overlappingDays.charAt(i)) {
                            case 'M': overlappingDayIndex = 0; break;
                            case 'T': overlappingDayIndex = 1; break;
                            case 'W': overlappingDayIndex = 2; break;
                            case 'R': overlappingDayIndex = 3; break;
                            case 'F': overlappingDayIndex = 4; break;
                        }

                        //pushing class_ on appropriate day into appropriate classGroup array that it overlaps with 
                        alert("WARNING: " + courseobj.cnum + " and " + otherClass['obj'].cnum + " overlap!");
                        $scope.masterOverlap[overlappingDayIndex][classGroup].push({
                            obj: courseobj,
                            startTime: ts,
                            endTime: te
                        });
                    }
                }
            }
        }
    }

    
    $scope.schedule = function(courseobj) {

        //make undoable by adding to actions list if appropriate
        if($scope.undoing == false && $scope.parsing == false) {
            $scope.actions.push({
                type: 'add',
                sc: courseobj
            });
        }

        //prevent adding courses with null time info
        if(courseobj.days == " " || courseobj.time.indexOf('TBD') != -1) {
            console.log("Error: Course days/times TBD");
            return;
        }
        
        //don't schedule duplicates
        if($scope.scheduledCourses) { //!== undefined
            for(var i=0; i<$scope.findCourse(courseobj.CRN, $scope.scheduledCourses).length; i++) {
                if($scope.findCourse(courseobj.CRN, $scope.scheduledCourses)[i] == courseobj) {
                    return;
                }
            }
        }

        //Inject HTML
        var title = "";
        var time = "";
        var daysstr = courseobj.days;
        var coursetag = timeCalc.main(courseobj, 0);

        var justAdded = [];
        function modifyTitleTime(courseobj) {
            if(courseobj.ctitle.indexOf('-') != -1) {
                title = courseobj.ctitle.substring(0,courseobj.ctitle.indexOf('-'));
                cinfo = courseobj.ctitle.substring(courseobj.ctitle.indexOf('-')+2);
                master = true;
            }
            else title = courseobj.ctitle;

            var ctime = courseobj.time;
            time = ctime.substring(0,ctime.length-1-1) + ' ' + ctime.substring(ctime.length-1-1,ctime.length-1) + '.m.';
        }
        modifyTitleTime(courseobj);
        function injectListHTML(courseobj) {
            var liststr = '<div data-crn="' + courseobj.CRN + '" class="list"><span data-crn="' + courseobj.CRN + '" class="glyphicon glyphicon-remove-circle removebtn"></span><b>' + title + ': <br>' + courseobj.cnum + ' ' + courseobj.actv + ' </b>- ' + courseobj.CRN + '<br><small>' + time + ', ' + courseobj.days + '</small></div>';
            var $jQOL = $($.parseHTML(liststr));
            $("#clist").append($jQOL);
            $scope.cssColor(courseobj, $jQOL);
        }
        injectListHTML(courseobj);
        function injectCalendarHTML(courseobj) {
            var $jQO;
            var i = daysstr.length;
            //Loop for every course day i
            while(i--) {
                var coursestr = '<div ' + 'data-crn="' + courseobj.CRN + '" ' + 'data-added="true" ' + 'class="event"><span data-crn="' + courseobj.CRN + '" class="glyphicon glyphicon-remove-circle removebtn onschedbox"></span>';
                coursestr = (coursestr+'<b>'+courseobj.cnum+' '+courseobj.actv+'</b> <small>'+time+' <sup>['+courseobj.CRN+']</sup></small>'+'</div>').replace("event","event "+daysstr.charAt(i).toLowerCase());
                //console.log("Before CSS: " + coursestr)
                $jQO = $($.parseHTML(coursestr));
                $(coursetag).append($jQO);
                
                var durationCSS = timeCalc.main(courseobj, 1) + 'px';
                var startShiftCSS = 'calc( -20px ' + '- 60px + ' + timeCalc.main(courseobj, 2)[1] + 'px' + ')';
                
                //Starting CSS for all courseobjs:
                $jQO.css({
                    'margin-top': startShiftCSS,
                    'height': durationCSS,
                    'color': 'white',
                    'border-radius': '5px'
                });
                $scope.cssColor(courseobj, $jQO);

                justAdded.push($jQO);
                //OverlapTester:
                console.log("**ADDED.CSS: " + $jQO.prop('outerHTML'))
            }
        }
        injectCalendarHTML(courseobj);
        
        $scope.scheduledCourses.push(courseobj);
        $scope.scheduleMaster(courseobj);
        
        //Check for and modify around overlap
        function adjustOverlapCSS(courseobj) {
            //$scope.masterOverlap[day] == [[{class_ object}],[{}],...] == classesToday
            //$scope.masterOverlap[day][classGroup] == [{class_ object}] == classGroup
            //$scope.masterOverlap[day][classGroup][class_] == {class_ object}
            var eventSize = 12.4; //Size of event elements, in %
            //interate through classes per each day of the week
            for(var day=0; day<5; day++) {
                for(var classGroup=0; classGroup<$scope.masterOverlap[day].length; /*iterate over array classGroup*/ classGroup++) {
                    var numOverlaps = $scope.masterOverlap[day][classGroup].length;
                    if(numOverlaps > 1) { // == if overlappingDays exist
                        for(var class_=0; class_<$scope.masterOverlap[day][classGroup].length; class_++) {

                            var otherClass = $scope.masterOverlap[day][classGroup][class_];
                            var dayClass;

                            switch(dayClass = day) {
                                case 0: overlappingDayIndex = '.m'; break;
                                case 1: overlappingDayIndex = '.t'; break;
                                case 2: overlappingDayIndex = '.w'; break;
                                case 3: overlappingDayIndex = '.r'; break;
                                case 4: overlappingDayIndex = '.f'; break;
                            }

                            var classStr = dayClass + '[data-crn="' + $scope.scheduledCourses[course].CRN + '"]';
                            var attr = $(str).attr("data-added");

                            //if just added within $scope.schedule(), keep at front
                            if(attr && typeof attr !== typeof undefined && attr !== false) { //or just if(attr) ????????
                                $(classStr).css({
                                    'width': eventSize/(numOverlaps) + '%',
                                    'margin-left': 'calc(10px)'
                                });
                                $('div'+str).addClass('overlapmember1');
                            }
                            else {
                                $(classStr).css({
                                    'width': eventSize/(numOverlaps) + '%',
                                    'margin-left': 'calc(' + eventSize/(numOverlaps)/(class_) + '% + 10px)'
                                    // class_ represents the index of the class within the classGroup
                                });
                            }
                        }   
                    }
                }
            }
        }
        adjustOverlapCSS(courseobj);

        //courseobj hover - need here?
        $('div[data-crn="' + courseobj.CRN + '"]').hover(function() {
            $('div[data-crn="' + courseobj.CRN + '"]').addClass('active');
        },function(){
            $('div[data-crn="' + courseobj.CRN + '"]').removeClass('active');
        });
        //Click remove button--UNSCHEDULE - need here?
        $('.removebtn').click(function(e) {
            var crn = $(this).data("crn");
            //$(this).remove(); //remove the remove button itself
            $scope.unschedule(crn);
            e.stopPropagation();
        });

        //still need this? need here?
        $.each(justAdded, function(index, value){
            $(this).removeAttr("data-added");
        })

        //work with same CRN on different day at different time
        if($scope.dupes == 0 && $scope.findCourse(courseobj.CRN, $scope.courses).length > 1) {
            $scope.dupes = $scope.findCourse(courseobj.CRN, $scope.courses).length;
            $scope.dupeWorker(courseobj.CRN);
        }

        //update table CRN css
        $('.courserow[data-crn="' + courseobj.CRN + '"]').css({
            'background-color' : '#A29061',
            'color': 'white'
        });

        //update localStorage and textarea
        if(localStorage.crns.indexOf(courseobj.CRN) == -1) {
            localStorage.crns = (localStorage.crns + " " + courseobj.CRN).trim();
            if(localStorage.crns.indexOf('  ') > -1)
                localStorage.crns.replace('  ', ' ');
            $('#coursedump').val(localStorage.getItem("crns"));
        }
    }
    
    $scope.unschedule = function(crn) {
        if($scope.undoing == false && $scope.clearing == false) {
            $scope.$apply(function() {
                $scope.actions.push({
                    type: 'remove',
                    sc: $scope.findCourse(crn, $scope.courses)[0]
                });
            });
        }

        var courseobj = {};
        $('div[data-crn="' + crn + '"]').remove();
        $('.courserow[data-crn="' + crn + '"]').css({
            'background-color' : '',
            'color': ''
        });
        for(var i=0; i<$scope.scheduledCourses.length; i++) {
            if($scope.scheduledCourses[i].CRN == crn){
                courseobj = $scope.scheduledCourses[i];
                $scope.scheduledCourses.splice(i,1);
            }
        }
        localStorage.crns = localStorage.crns.replace(crn, '');
        var str = localStorage.crns;
        var re = /(\s{2,})/g;
        var result = str.replace(re, ' ');
        localStorage.crns = result;
        $('#coursedump').val(localStorage.getItem("crns").trim());
        
        //Readjust overlapping CSS
        var eventSize = 12.4;
        // ............................... <implement here>

        //$scope.verifyCorresp(courseobj);
    }            
    
    $scope.toggleSchedule = function(courseobj) {
        if($scope.findCourse(courseobj.CRN, $scope.scheduledCourses).length >= 1) {
            $scope.unschedule(courseobj.CRN)
        }
        else $scope.schedule(courseobj)
    }

    $scope.listColor = function(crn) {
        if($scope.findCourse(crn, $scope.scheduledCourses).length >= 1)
            return {
            'background-color' : '#A29061',
            'color': 'white'
            };
    }
    
    ////////////////////Filters:
    $scope.allLimit = 30;
    $scope.reachedEnd = false;
    $scope.filter = {
        litAll: false,
        closed: false,
        department: "All",
        incTBD: false
    }
    
    //Comparator:
    $scope.filterByDepartment = function(ac, ex) { //passed "expected" value from filter expression (in this case {department: filter['department']}),  actual value from the object in the array
    //in this case ac = filter['department'], a string
        if(ac === undefined || ex === undefined) {
            console.log("undefined")
            return false;
        }
        if(ex == ac.department || ex == "All")
            return true;
        return false;
    }
    //Expression:
    $scope.filterInClosed = function(course) { //passed value, index, and array
        if($scope.filter['closed'] == true && (course.seats_avail == "Closed" || Number(course.seats_avail) <= 0)) //True, include closed
            return course;
        else if($scope.filter['closed'] == false && (course.seats_avail == "Closed" || Number(course.seats_avail) <= 0)) //False, don't
            return;
        else return course;
    }
    //pseudo-limitTo filter expression:
    $scope.limitAll = function(course, index) {
        if(index == $scope.allLimitMax-1)
            $scope.reachedEnd = true;
        if($scope.filter['department'] == "All" && index < $scope.allLimit && !$scope.filter['litAll'])
            return course;
        else if($scope.filter['department'] != "All")
            return course;
        else if($scope.filter['litAll'])
            return course;
        else return;
    }
    //incTBD expression:
    $scope.filterInTBD = function(course) { //passed value, index, and array
        if($scope.filter['incTBD'] == true && (course.days == " " || course.time == "TBD-TBD")) 
            return course;
        else if($scope.filter['incTBD'] == true && (course.days != " " && course.time != "TBD-TBD"))
            return course;
        else if (!$scope.filter['incTBD'] && (course.days != " " && course.time != "TBD-TBD"))
            return course;
        else return;
    }
    
    $scope.cssColor = function(courseobj, $jQO) {
        if($scope.colorScheme['eng'].indexOf(courseobj.department) > -1) {
            var color = new KolorWheel([0, 67, 35]);
            color.l+= ($scope.colorScheme['eng'].indexOf(courseobj.department)*2.7);
            color.s+= ($scope.colorScheme['eng'].indexOf(courseobj.department)*3)
            color.h+= ($scope.colorScheme['eng'].indexOf(courseobj.department)*1.2)
            $jQO.css({
                'background-color': color.getHex(),
                'border-color': color.getHex(),
                'text-shadow': '0px 0px 3px ' + color.getHex(),
                'border': '2px solid ' + color.getHex()
            });
        }
        if($scope.colorScheme['natsci'].indexOf(courseobj.department) > -1) {
            var color = new KolorWheel([45, 67, 35]);
            color.l+= ($scope.colorScheme['natsci'].indexOf(courseobj.department)*2.7);
            color.s+= ($scope.colorScheme['natsci'].indexOf(courseobj.department)*3)
            color.h+= ($scope.colorScheme['natsci'].indexOf(courseobj.department)*1.2)
            $jQO.css({
                'background-color': color.getHex(),
                'border-color': color.getHex(),
                'text-shadow': '0px 0px 3px ' + color.getHex(),
                'border': '2px solid ' + color.getHex()
            });
        }
        if($scope.colorScheme['ssha'].indexOf(courseobj.department) > -1) {
            var color = new KolorWheel([220, 67, 35]);
            color.l+= ($scope.colorScheme['ssha'].indexOf(courseobj.department)*2.7);
            color.s+= ($scope.colorScheme['ssha'].indexOf(courseobj.department)*3)
            color.h+= ($scope.colorScheme['ssha'].indexOf(courseobj.department)*1.2)
            $jQO.css({
                'background-color': color.getHex(),
                'border-color': color.getHex(),
                'text-shadow': '0px 0px 3px ' + color.getHex(),
                'border': '2px solid ' + color.getHex()
            });
        }
    }

});
    
app.factory('courseListing', function($http) {
    return {
        getAllCourses: function() {
            var url = "http://ucm.karinaantonio.com" + "/courses.JSON";
            return $http.get(url);
        }
    };
});

app.factory('timeCalc', function() {

    return {
        main: function(courseobj, opt){
            var str = courseobj.time;
            
            var re_endMerid = /\d+:\d+-\d+:\d+([ap])m/;
            var endMerid = (function() {var m = re_endMerid.exec(str); re_endMerid.lastIndex++; return m[1];})();
            var startMerid = endMerid;
            
            var re_startTime = /(\d+:\d+)-\d+:\d+[ap]m/;
            var startTime = (function() {var m = re_startTime.exec(str); re_startTime.lastIndex++; return m[1];})();
            var startHour = Number(startTime.substring(0,startTime.indexOf(':')));
            var startMin = Number(startTime.substring(1+startTime.indexOf(':')));
            
            var re_endTime = /\d+:\d+-(\d+:\d+)[ap]m/;
            var endTime = (function() {var m = re_endTime.exec(str); re_endTime.lastIndex++; return m[1];})();
            var endHour = Number(endTime.substring(0,endTime.indexOf(':')));
            var endMin = Number(endTime.substring(1+endTime.indexOf(':')));

            var duration_min = 0;
            if(endMerid == 'p' && startHour > endHour && startHour < 12) {
                duration_min = ((12 - startHour) + endHour)*60 + (startMin - 60) + endMin;
                startMerid = 'a';
            }
            else if(startHour == 12) {
                temp = endHour + 12;
                duration_min = (temp - startHour)*60 + (endMin - startMin);
            }
            else {
                duration_min = (endHour - startHour)*60 + (endMin - startMin);
            }
            
            if(opt==0) {
                if(startHour < 11)
                    return "#" + String(startHour+1) + startMerid;
                else if(startHour == 11)
                    return "#12p";
                else if(startHour == 12)
                    return "#1p";
                else return "#" + String(startHour+1) + startMerid;
            }
            if(opt==1) {
                return duration_min;
            }
            else {
                return [startHour, startMin, startMerid, endHour, endMin, endMerid];
            }
        }
    };
}); 

app.filter('timeCorrect', function() {
   return function(time) {
       return time.substring(0,time.length-1-1) + ' ' + time.substring(time.length-1-1,time.length-1) + '.m.';
   } 
});

