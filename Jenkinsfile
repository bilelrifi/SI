podTemplate(containers: [
    containerTemplate(name: 'podman', image: 'quay.io/podman/stable:latest', command: 'cat', ttyEnabled: true),
    containerTemplate(name: 'kubectl', image: 'lachlanevenson/k8s-kubectl:latest', command: 'cat', ttyEnabled: true),
    containerTemplate(
        name: 'jnlp',
        image: 'jenkins/inbound-agent:3107.v665000b_51092-15',
        envVars: [
            envVar(key: 'HOME', value: '/home/jenkins')
        ]
    )
]) {
    node(POD_LABEL) {
        environment {
            PROJECT_NAME = "gamma"
            OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"
            REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
            FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
            BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"
        }

        /*stage('Diagnostics') {
            steps {
                sh '''
                    echo "Jenkins Environment Diagnostics"
                    echo "Jenkins Version: $(jenkins --version 2>/dev/null || echo 'jenkins command not found')"
                    echo "Pipeline Plugin Versions:"
                    echo "workflow-aggregator: $(cat /var/jenkins_home/plugins/workflow-aggregator/META-INF/MANIFEST.MF 2>/dev/null | grep Plugin-Version || echo 'Not found')"
                    echo "workflow-cps: $(cat /var/jenkins_home/plugins/workflow-cps/META-INF/MANIFEST.MF 2>/dev/null | grep Plugin-Version || echo 'Not found')"
                    echo "workflow-step-api: $(cat /var/jenkins_home/plugins/workflow-step-api/META-INF/MANIFEST.MF 2>/dev/null | grep Plugin-Version || echo 'Not found')"
                    echo "git: $(cat /var/jenkins_home/plugins/git/META-INF/MANIFEST.MF 2>/dev/null | grep Plugin-Version || echo 'Not found')"
                    echo "SCM Configuration:"
                    echo "SCM: $SCM_URL"
                    echo "Working Directory: $(pwd)"
                '''
            }
        }*/

        stage('Clone Repository') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift') {
            steps {
                container('kubectl') {
                    withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                        sh '''
                            echo "Logging into OpenShift with token..."
                            echo "Token length: ${#OC_TOKEN}"
                            oc login --token=$OC_TOKEN --server=$OPENSHIFT_SERVER --insecure-skip-tls-verify
                            oc project $PROJECT_NAME
                            echo "Successfully logged in and switched to project: $PROJECT_NAME"
                            oc whoami
                            oc project
                        '''
                    }
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                container('podman') {
                    withCredentials([usernamePassword(credentialsId: "$REGISTRY_CREDENTIALS", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                        sh '''
                            echo "Logging into Quay.io..."
                            podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                            echo "Building frontend image for Quay.io..."
                            podman build -t $FRONTEND_IMAGE -f frontend/Dockerfile .
                        '''
                    }
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                container('podman') {
                    withCredentials([usernamePassword(credentialsId: "$REGISTRY_CREDENTIALS", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                        sh '''
                            echo "Logging into Quay.io..."
                            podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                            echo "Building backend image for Quay.io..."
                            podman build -t $BACKEND_IMAGE -f backend/Dockerfile .
                        '''
                    }
                }
            }
        }

        stage('Push Images to Quay.io') {
            steps {
                container('podman') {
                    withCredentials([usernamePassword(credentialsId: "$REGISTRY_CREDENTIALS", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                        sh '''
                            echo "Logging into Quay.io..."
                            podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                            echo "Pushing frontend image to Quay.io..."
                            podman push $FRONTEND_IMAGE
                            echo "Pushing backend image to Quay.io..."
                            podman push $BACKEND_IMAGE
                        '''
                    }
                }
            }
        }

        stage('Deploy Applications from Quay.io') {
            steps {
                container('kubectl') {
                    withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                        sh '''
                            echo "Deploying applications to OpenShift from Quay.io..."
                            oc login --token=$OC_TOKEN --server=$OPENSHIFT_SERVER --insecure-skip-tls-verify
                            oc project $PROJECT_NAME
                            echo "Deleting existing frontend and backend resources (if any)..."
                            oc delete all -l app=job-frontend || true
                            oc delete all -l app=job-backend || true
                            echo "Deploying frontend application from $FRONTEND_IMAGE..."
                            oc new-app $FRONTEND_IMAGE --name=job-frontend
                            oc expose svc/job-frontend
                            echo "Deploying backend application from $BACKEND_IMAGE..."
                            oc new-app $BACKEND_IMAGE --name=job-backend
                            oc expose svc/job-backend
                        '''
                    }
                }
            }
        }
    }
}